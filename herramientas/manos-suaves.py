#!/usr/bin/env python3
"""Manos suaves para los soldados de Meshy (18/10/2026).

Los cuerpos de Meshy pasaron por `cerrar-manos.mjs` (enrolla los dedos sobre la
palma) y por `simplificar.mjs` (13.000 triángulos): lo que queda de cada mano es
un amasijo de triángulos puntiagudos, como papel arrugado. No hay forma de
deshacerlo sin el original, así que aquí se TIRA la mano vieja y se pone en su
lugar el casco convexo de sus vértices, ya sin los pinchos (se recorta lo que
cae fuera del 6-94 % de cada eje principal de la mano), alisado y de un solo
color de piel: el del texel de la mano que más se parece a la mediana de la
mano, en una zona plana de la textura.

El casco son vértices NUEVOS, copias de los de la mano con sus huesos y pesos
(así anda con el esqueleto como antes) pero con otra UV y otra normal; los
triángulos viejos de la mano se quitan. El esqueleto, las animaciones y la
textura no se tocan, y el archivo no crece (se recompone el binario).

Uso:  python3 herramientas/manos-suaves.py <origen.glb> <destino.glb>
      (pasarlo UNA vez por archivo, y sobre el original: dos veces haría el
      casco del casco)
Necesita numpy, scipy y pillow. Sin Blender ni Meshy: sale en un segundo.
Después hay que volver a pasar `guion-retratos.mjs`: la mano cambia el retrato.
"""
import sys, io, json, struct
import numpy as np
from scipy.spatial import ConvexHull
from PIL import Image

def leer(path):
    d=open(path,'rb').read()
    magic,ver,total=struct.unpack('<4sII',d[:12])
    lj,tj=struct.unpack('<I4s',d[12:20]); js=json.loads(d[20:20+lj]); o=20+lj
    lb,tb=struct.unpack('<I4s',d[o:o+8]); bn=bytearray(d[o+8:o+8+lb])
    return js,bn
def guardar(path,js,bn):
    j=json.dumps(js,separators=(',',':')).encode(); j+=b' '*((4-len(j)%4)%4)
    b=bytes(bn); b+=b'\0'*((4-len(b)%4)%4)
    out=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(b))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(b),b'BIN\0')+b
    open(path,'wb').write(out)
DT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
CO={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def vista(js,bn,i):
    a=js['accessors'][i]; v=js['bufferViews'][a['bufferView']]
    dt=np.dtype(DT[a['componentType']]); n=CO[a['type']]
    paso=v.get('byteStride') or dt.itemsize*n
    base=v.get('byteOffset',0)+a.get('byteOffset',0)
    return a,base,paso,dt,n
def leer_acc(js,bn,i):
    a,base,paso,dt,n=vista(js,bn,i)
    cnt=a['count']
    if paso==dt.itemsize*n:
        arr=np.frombuffer(bn,dtype=dt,count=cnt*n,offset=base).reshape(cnt,n).copy()
    else:
        arr=np.zeros((cnt,n),dt)
        for k in range(cnt): arr[k]=np.frombuffer(bn,dtype=dt,count=n,offset=base+k*paso)
    if a.get('normalized'):
        arr=arr.astype(np.float32)/(255.0 if dt==np.uint8 else 65535.0 if dt==np.uint16 else 127.0)
    return arr
def escribir_acc(js,bn,i,arr):
    a,base,paso,dt,n=vista(js,bn,i)
    arr=np.asarray(arr).astype(dt).reshape(-1,n)
    for k in range(a['count']):
        bn[base+k*paso:base+k*paso+dt.itemsize*n]=arr[k].tobytes()

def empaquetar(js,bn):
    """Tira los bufferViews que ya no usa ningun accesor ni imagen y recompone el binario."""
    usados=sorted({a['bufferView'] for a in js['accessors'] if 'bufferView' in a}|{i['bufferView'] for i in js.get('images',[]) if 'bufferView' in i})
    nuevo=bytearray(); mapa={}; vistas=[]
    for k,i in enumerate(usados):
        v=dict(js['bufferViews'][i]); o=v.get('byteOffset',0); L=v['byteLength']
        v['byteOffset']=len(nuevo); nuevo.extend(bytes(bn[o:o+L])); nuevo.extend(b'\0'*((4-L%4)%4))
        vistas.append(v); mapa[i]=k
    js['bufferViews']=vistas
    for a in js['accessors']:
        if 'bufferView' in a: a['bufferView']=mapa[a['bufferView']]
    for im in js.get('images',[]):
        if 'bufferView' in im: im['bufferView']=mapa[im['bufferView']]
    js['buffers'][0]['byteLength']=len(nuevo)
    return nuevo


def imagen_base(js,bn):
    m=js['materials'][js['meshes'][0]['primitives'][0]['material']]
    ti=m['pbrMetallicRoughness']['baseColorTexture']['index']
    src=js['textures'][ti]['source']; im=js['images'][src]
    v=js['bufferViews'][im['bufferView']]; o=v.get('byteOffset',0)
    return Image.open(io.BytesIO(bytes(bn[o:o+v['byteLength']]))).convert('RGB')

def normales(P,F):
    n=np.zeros_like(P)
    fn=np.cross(P[F[:,1]]-P[F[:,0]],P[F[:,2]]-P[F[:,0]])
    for k in range(3): np.add.at(n,F[:,k],fn)
    l=np.linalg.norm(n,axis=1,keepdims=True); l[l==0]=1
    return n/l

def procesar(origen,destino,iters=6,tope_sigma=3.0,hwmin=0.6,verbose=True):
    js,bn=leer(origen)
    prim=js['meshes'][0]['primitives'][0]; at=prim['attributes']
    A={k:leer_acc(js,bn,i) for k,i in at.items()}
    P=A['POSITION'].astype(float); N=A['NORMAL'].astype(float); UV=A['TEXCOORD_0'].astype(float)
    J=A['JOINTS_0'].astype(int); W=A['WEIGHTS_0'].astype(float)
    F=leer_acc(js,bn,prim['indices']).reshape(-1,3).astype(np.int64)
    sk=js['skins'][0]; names=[js['nodes'][j]['name'] for j in sk['joints']]
    img=imagen_base(js,bn); iw,ih=img.size; tex=np.asarray(img).astype(float)
    nuevos={k:[] for k in A}; nidx=[]; base=len(P); quitar=np.zeros(len(F),bool)
    for nm in ('LeftHand','RightHand'):
        ji=names.index(nm)
        hw=sum(np.where(J[:,c]==ji,W[:,c],0) for c in range(4))
        m=hw>=hwmin
        Q=P[m]
        # recortar atipicos (pinchos y trozos de antebrazo): se queda lo que cae
        # dentro del 6-94 % de cada eje principal de la mano
        c=np.median(Q,axis=0); _,_,vt=np.linalg.svd(Q-c,full_matrices=False); pr=(Q-c)@vt.T
        lo=np.percentile(pr,6,axis=0); hi=np.percentile(pr,94,axis=0)
        keep=((pr>=lo)&(pr<=hi)).all(axis=1)
        idxs=np.nonzero(m)[0][keep]; Qk=P[idxs]
        hull=ConvexHull(Qk)
        Hv=hull.vertices; remap={v:i for i,v in enumerate(Hv)}
        Hp=Qk[Hv].copy(); Hf=np.array([[remap[a] for a in f] for f in hull.simplices])
        # orientar caras hacia fuera
        cen=Hp.mean(0)
        for r in range(len(Hf)):
            a,b,cc=Hp[Hf[r]]; nn=np.cross(b-a,cc-a)
            if np.dot(nn,(a+b+cc)/3-cen)<0: Hf[r]=Hf[r][[0,2,1]]
        # Taubin sobre el casco
        ady=[set() for _ in range(len(Hp))]
        for a,b,cc in Hf: ady[a].update((b,cc)); ady[b].update((a,cc)); ady[cc].update((a,b))
        def paso(X,l):
            Y=X.copy()
            for v in range(len(X)): Y[v]=X[v]+l*(X[list(ady[v])].mean(0)-X[v])
            return Y
        for _ in range(iters): Hp=paso(Hp,0.5); Hp=paso(Hp,-0.53)
        # pesos/huesos: del vertice original mas cercano
        src=idxs[Hv]
        # color de piel: mediana de la mano, y el vertice cuyo texel se le parece y esta en zona plana
        hv=np.nonzero(hw>0.9)[0]
        def texel(u,v):
            x=int(np.clip(u*iw,0,iw-1)); y=int(np.clip(v*ih,0,ih-1)); return x,y
        cols=np.array([tex[texel(*UV[i])[1],texel(*UV[i])[0]] for i in hv])
        med=np.median(cols,axis=0)
        mejor=None
        for i,col in zip(hv,cols):
            x,y=texel(*UV[i]); x0,x1,y0,y1=max(x-3,0),min(x+4,iw),max(y-3,0),min(y+4,ih)
            patch=tex[y0:y1,x0:x1].reshape(-1,3); plano=patch.std(0).mean(); dist=np.linalg.norm(col-med)
            sc=dist+2*plano
            if mejor is None or sc<mejor[0]: mejor=(sc,i)
        iu=mejor[1]
        n=normales(Hp,Hf)
        if verbose: print(nm,'cloud',int(m.sum()),'tras recorte',len(idxs),'casco',len(Hp),'verts',len(Hf),'caras; uv piel',UV[iu].round(3),'color',tex[texel(*UV[iu])[1],texel(*UV[iu])[0]].round(0))
        # tangente cualquiera perpendicular
        t=np.cross(n,np.array([0,1,0])); bad=np.linalg.norm(t,axis=1)<1e-3; t[bad]=np.cross(n[bad],np.array([1,0,0])); t/=np.linalg.norm(t,axis=1,keepdims=True)
        tang=np.concatenate([t,np.ones((len(t),1))],axis=1)
        nuevos['POSITION'].append(Hp); nuevos['NORMAL'].append(n)
        nuevos['TEXCOORD_0'].append(np.tile(UV[iu],(len(Hp),1)))
        if 'TANGENT' in nuevos: nuevos['TANGENT'].append(tang)
        nuevos['JOINTS_0'].append(J[src]); nuevos['WEIGHTS_0'].append(W[src])
        nidx.append(Hf+base); base+=len(Hp)
        # quitar triangulos de la mano vieja (todos sus vertices con hw>=0.6)
        quitar|=m[F].all(axis=1)
    # reconstruir accesores
    def reemplazar(i,arr,dtype=None):
        a=js['accessors'][i]
        dt=np.dtype(DT[a['componentType']]); n=CO[a['type']]
        arr=np.asarray(arr).astype(dt).reshape(-1,n); data=arr.tobytes()
        pad=(4-len(data)%4)%4
        js['bufferViews'].append({'buffer':0,'byteOffset':len(bn),'byteLength':len(data),**({'target':js['bufferViews'][a['bufferView']].get('target')} if js['bufferViews'][a['bufferView']].get('target') else {})})
        bn.extend(data+b'\0'*pad)
        a['bufferView']=len(js['bufferViews'])-1; a['byteOffset']=0; a['count']=len(arr)
        for k in ('min','max'): a.pop(k,None)
        return a
    for k in A:
        full=np.concatenate([A[k]]+nuevos[k],axis=0)
        if A[k].dtype.kind=='f' or True:
            # conservar el dtype original (los normalizados se reconvierten: los datos eran float aqui)
            pass
        a=js['accessors'][at[k]]
        if a.get('normalized'):  # WEIGHTS/UV normalizados: volver a enteros
            sc=255.0 if DT[a['componentType']]==np.uint8 else 65535.0
            full=np.round(full*sc)
        ac=reemplazar(at[k],full)
        if k=='POSITION': ac['min']=full.min(0).tolist(); ac['max']=full.max(0).tolist()
    Fn=np.concatenate([F[~quitar]]+nidx,axis=0)
    reemplazar(prim['indices'],Fn.reshape(-1))
    bn=empaquetar(js,bn)
    guardar(destino,js,bn)
    if verbose: print('tris',len(F),'->',len(Fn),'quitados',int(quitar.sum()))
if __name__=='__main__':
    procesar(sys.argv[1],sys.argv[2])
