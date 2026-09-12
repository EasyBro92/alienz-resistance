// Las seis tablas de oleadas de la campaña, sueltas de los destinos.
//
// Antes cada nivel llevaba la suya dentro y eran seis niveles: uno a uno. Con
// doce destinos por el mundo, escribir doce tablas a mano habría dado doce
// niveles sin medir. Estas seis están probadas, así que se comparten: lo que
// distingue a un destino de otro que use la misma tabla es su `dureza`, o sea
// cuánto aguanta de más el mismo huésped en cada oleada.
//
// Los nombres dicen a qué juega cada una, que es lo que hay que saber al
// repartirlas por el mapa:
//
//   avanzadilla · de frente y poco más, para enseñar
//   formas      · escupen, saltan y revientan: tres maneras nuevas
//   contraflujo · todo llega deprisa; lo lento no llega a tiempo
//   colmena     · se curan entre ellos y el caparazón devuelve las balas
//   madre       · campamento grande, y un jefe al final
//   todas       · todas las formas a la vez, y dos jefes al cierre
export const OLEADAS = {
  avanzadilla: [
    { gap: 6, spawns: [{ type: 'walker', count: 4, every: 1.6, lanes: [1, 2, 3] }] },
    { gap: 8, spawns: [{ type: 'walker', count: 6, every: 1.2, lanes: [1, 2, 3] }, { type: 'runner', count: 2, every: 3, lanes: [1, 2, 3] }] },
    { gap: 8, spawns: [{ type: 'walker', count: 8, every: 1 }, { type: 'runner', count: 4, every: 2 }] },
    { gap: 9, spawns: [{ type: 'walker', count: 8, every: 0.9 }, { type: 'armored', count: 2, every: 3.4 }] },
    { gap: 9, spawns: [{ type: 'walker', count: 10, every: 0.8 }, { type: 'runner', count: 5, every: 1.6 }, { type: 'armored', count: 3, every: 2.8 }] }
  ],
  formas: [
    { gap: 6, spawns: [{ type: 'walker', count: 6, every: 1.2 }, { type: 'runner', count: 3, every: 2.2 }] },
    { gap: 8, spawns: [{ type: 'walker', count: 8, every: 1 }, { type: 'spitter', count: 2, every: 4 }] },
    { gap: 8, spawns: [{ type: 'armored', count: 4, every: 2.2 }, { type: 'walker', count: 8, every: 1 }] },
    { gap: 8, spawns: [{ type: 'leaper', count: 3, every: 3 }, { type: 'walker', count: 9, every: 0.9 }, { type: 'spitter', count: 2, every: 4 }] },
    { gap: 9, spawns: [{ type: 'bloater', count: 3, every: 3.4 }, { type: 'runner', count: 8, every: 1.1 }, { type: 'armored', count: 3, every: 2.6 }] },
    { gap: 9, spawns: [{ type: 'leaper', count: 4, every: 2.6 }, { type: 'bloater', count: 3, every: 3.2 }, { type: 'walker', count: 10, every: 0.9 }] },
    { gap: 10, spawns: [{ type: 'tank', count: 1, every: 6 }, { type: 'armored', count: 4, every: 2 }, { type: 'spitter', count: 3, every: 3 }, { type: 'walker', count: 10, every: 1 }] }
  ],
  madre: [
    { gap: 3,  spawns: [{ type: 'walker', count: 4, every: 1.5, lanes: [1, 2, 3] }] },
    { gap: 4,  spawns: [{ type: 'walker', count: 7, every: 1.1, lanes: [1, 2, 3] }, { type: 'runner', count: 3, every: 2.2, lanes: [1, 2, 3] }] },
    // A partir de aquí entra uno nuevo por oleada, y solo uno: si aparecen dos
    // maneras desconocidas a la vez, el jugador no llega a entender cuál de las
    // dos le ha roto la línea y aprende que el juego es injusto, no la mecánica.
    { gap: 4,  spawns: [{ type: 'walker', count: 9, every: 0.9 }, { type: 'armored', count: 3, every: 2.6 }, { type: 'leaper', count: 2, every: 4 }] },
    { gap: 5, spawns: [{ type: 'runner', count: 9, every: 0.8 }, { type: 'spitter', count: 3, every: 3.0 }, { type: 'bloater', count: 2, every: 4.5 }] },
    { gap: 5, spawns: [{ type: 'walker', count: 10, every: 0.7 }, { type: 'armored', count: 4, every: 2.0 }, { type: 'healer', count: 2, every: 5 }, { type: 'leaper', count: 3, every: 3.2 }] },
    { gap: 6, spawns: [{ type: 'tank', count: 1, every: 6 }, { type: 'walker', count: 10, every: 0.8 }, { type: 'runner', count: 5, every: 1.4 }, { type: 'burrower', count: 3, every: 3.4 }] },
    { gap: 6, spawns: [{ type: 'armored', count: 7, every: 1.2 }, { type: 'spitter', count: 4, every: 2 }, { type: 'tank', count: 2, every: 5 }, { type: 'healer', count: 3, every: 3.5 }, { type: 'bloater', count: 4, every: 2.6 }] },
    { gap: 7, boss: true, spawns: [{ type: 'boss', count: 1, every: 1 }, { type: 'tank', count: 2, every: 14 }, { type: 'walker', count: 16, every: 0.9 }, { type: 'runner', count: 8, every: 1.8 }, { type: 'healer', count: 4, every: 5 }, { type: 'burrower', count: 6, every: 3 }, { type: 'leaper', count: 6, every: 2.8 }] }
  ],
  contraflujo: [
    { gap: 7, spawns: [{ type: 'runner', count: 5, every: 1.5 }, { type: 'leaper', count: 1, every: 4 }] },
    { gap: 6, spawns: [{ type: 'runner', count: 8, every: 1 }, { type: 'walker', count: 5, every: 1.4 }] },
    { gap: 6, spawns: [{ type: 'leaper', count: 7, every: 1.6 }, { type: 'runner', count: 10, every: 0.9 }] },
    { gap: 5, spawns: [{ type: 'runner', count: 14, every: 0.6 }, { type: 'burrower', count: 4, every: 2.4 }] },
    { gap: 5, spawns: [{ type: 'leaper', count: 8, every: 1.4 }, { type: 'armored', count: 5, every: 1.8 }, { type: 'runner', count: 10, every: 0.9 }] },
    { gap: 5, spawns: [{ type: 'burrower', count: 6, every: 1.8 }, { type: 'runner', count: 14, every: 0.6 }, { type: 'spitter', count: 4, every: 2.4 }] },
    { gap: 4, spawns: [{ type: 'tank', count: 1, every: 6 }, { type: 'runner', count: 16, every: 0.55 }, { type: 'leaper', count: 8, every: 1.4 }] },
    { gap: 4, spawns: [{ type: 'runner', count: 18, every: 0.5 }, { type: 'leaper', count: 10, every: 1.1 }, { type: 'burrower', count: 6, every: 1.8 }, { type: 'tank', count: 1, every: 8 }] }
  ],
  colmena: [
    { gap: 7, spawns: [{ type: 'armored', count: 3, every: 2.4 }, { type: 'healer', count: 1, every: 5 }] },
    { gap: 6, spawns: [{ type: 'healer', count: 2, every: 4 }, { type: 'armored', count: 5, every: 1.7 }] },
    { gap: 5, spawns: [{ type: 'armored', count: 8, every: 1.2 }, { type: 'spitter', count: 5, every: 2 }, { type: 'healer', count: 3, every: 3.4 }] },
    { gap: 5, spawns: [{ type: 'bloater', count: 6, every: 1.8 }, { type: 'armored', count: 7, every: 1.3 }, { type: 'healer', count: 3, every: 3 }] },
    { gap: 4, spawns: [{ type: 'tank', count: 1, every: 6 }, { type: 'healer', count: 4, every: 2.6 }, { type: 'armored', count: 8, every: 1.2 }] },
    { gap: 4, spawns: [{ type: 'spitter', count: 7, every: 1.6 }, { type: 'healer', count: 4, every: 2.4 }, { type: 'bloater', count: 6, every: 1.8 }] },
    { gap: 4, spawns: [{ type: 'tank', count: 2, every: 7 }, { type: 'armored', count: 9, every: 1.1 }, { type: 'healer', count: 4, every: 2.4 }] },
    { gap: 4, spawns: [{ type: 'healer', count: 5, every: 2.2 }, { type: 'armored', count: 10, every: 1 }, { type: 'burrower', count: 6, every: 1.8 }, { type: 'bloater', count: 6, every: 1.8 }] },
    { gap: 4, spawns: [{ type: 'tank', count: 2, every: 6 }, { type: 'healer', count: 5, every: 2.2 }, { type: 'armored', count: 10, every: 1 }, { type: 'spitter', count: 6, every: 1.8 }] }
  ],
  todas: [
    { gap: 7, spawns: [{ type: 'walker', count: 6, every: 1.3 }, { type: 'runner', count: 3, every: 2.2 }] },
    { gap: 6, spawns: [{ type: 'armored', count: 4, every: 1.9 }, { type: 'leaper', count: 3, every: 2.4 }] },
    { gap: 4, spawns: [{ type: 'healer', count: 3, every: 3 }, { type: 'spitter', count: 6, every: 1.7 }, { type: 'walker', count: 10, every: 0.9 }] },
    { gap: 4, spawns: [{ type: 'bloater', count: 6, every: 1.8 }, { type: 'burrower', count: 6, every: 1.8 }, { type: 'runner', count: 10, every: 0.9 }] },
    { gap: 4, spawns: [{ type: 'tank', count: 2, every: 6 }, { type: 'armored', count: 8, every: 1.2 }, { type: 'healer', count: 3, every: 3 }] },
    { gap: 4, spawns: [{ type: 'leaper', count: 10, every: 1.1 }, { type: 'runner', count: 14, every: 0.6 }, { type: 'spitter', count: 5, every: 2 }] },
    { gap: 3, spawns: [{ type: 'burrower', count: 8, every: 1.4 }, { type: 'bloater', count: 7, every: 1.5 }, { type: 'healer', count: 4, every: 2.4 }, { type: 'armored', count: 8, every: 1.2 }] },
    { gap: 3, spawns: [{ type: 'tank', count: 3, every: 5 }, { type: 'walker', count: 14, every: 0.7 }, { type: 'leaper', count: 8, every: 1.3 }] },
    { gap: 3, spawns: [{ type: 'healer', count: 5, every: 2.2 }, { type: 'armored', count: 10, every: 1 }, { type: 'spitter', count: 7, every: 1.5 }, { type: 'burrower', count: 8, every: 1.4 }] },
    { gap: 4, boss: true, spawns: [{ type: 'boss', count: 2, every: 22 }, { type: 'tank', count: 2, every: 16 }, { type: 'walker', count: 18, every: 0.8 }, { type: 'runner', count: 10, every: 1.4 }, { type: 'healer', count: 5, every: 4 }, { type: 'burrower', count: 8, every: 2.6 }, { type: 'leaper', count: 10, every: 2.2 }] }
  ]
}
