# Las voces del juego, dichas por las voces en castellano que trae Windows.
#
#   powershell -File herramientas/voces/hablar.ps1 <frases.json> <carpeta de salida>
#
# Lee la lista que le prepara `montar.mjs` (id, voz, texto, tono y ritmo de cada
# frase) y deja un .wav por frase. Usa las voces «OneCore» (Pablo, Helena, Laura),
# que son las del narrador y las únicas con voz de hombre: la API antigua (SAPI)
# solo enseña a Helena. No se instala nada ni sale nada a la red.
param([string]$lista, [string]$salida)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

# Las llamadas de WinRT son asíncronas y PowerShell 5 no sabe esperarlas: se
# convierten a tareas de .NET con el `AsTask` genérico.
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Esperar($op, $tipo) {
  $t = $asTask.MakeGenericMethod($tipo).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}

$voces = @{}
foreach ($v in [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices) {
  if ($v.Language -like 'es-*') { $voces[($v.DisplayName -replace 'Microsoft ', '').ToLower()] = $v }
}
if ($lista -eq '--voces') { $voces.Keys | Sort-Object; exit 0 }
if ($voces.Count -eq 0) { Write-Error 'Este Windows no trae ninguna voz en castellano'; exit 1 }

New-Item -ItemType Directory -Force $salida | Out-Null
$frases = Get-Content -Raw -Encoding UTF8 $lista | ConvertFrom-Json
$sinte = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$hechas = 0
foreach ($f in $frases) {
  $voz = $voces[$f.voz]
  if (-not $voz) { Write-Error "No está la voz $($f.voz)"; exit 1 }
  $sinte.Voice = $voz
  $texto = [System.Security.SecurityElement]::Escape($f.texto)
  # El tono y el ritmo van en SSML: es lo que hace de tres voces una docena.
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='$($voz.Language)'><prosody pitch='$($f.tono)' rate='$($f.ritmo)'>$texto</prosody></speak>"
  $flujo = Esperar ($sinte.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $lector = New-Object Windows.Storage.Streams.DataReader($flujo.GetInputStreamAt(0))
  Esperar ($lector.LoadAsync([uint32]$flujo.Size)) ([uint32]) | Out-Null
  $datos = New-Object byte[] ([int]$flujo.Size)
  $lector.ReadBytes($datos)
  [IO.File]::WriteAllBytes((Join-Path $salida "$($f.id).wav"), $datos)
  $hechas++
}
Write-Output "$hechas frases en $salida"
