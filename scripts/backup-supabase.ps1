param([string]$Destino = (Join-Path $PSScriptRoot ('../backups/sysgas-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')))
$ErrorActionPreference = 'Stop'
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw 'Instala las herramientas cliente de PostgreSQL (pg_dump) antes de hacer el respaldo.' }
# Configurar PGHOST, PGPORT, PGDATABASE y PGUSER con la conexión de Supabase.
foreach ($nombreVariable in @('PGHOST','PGDATABASE','PGUSER')) {
  if (-not [Environment]::GetEnvironmentVariable($nombreVariable)) { throw "Falta configurar $nombreVariable con los datos de conexión de Supabase." }
}
$rutaDestino = [IO.Path]::GetFullPath($Destino)
if (Test-Path -LiteralPath $rutaDestino) { throw 'El archivo de destino ya existe. Selecciona otro nombre.' }
$carpetaDestino = Split-Path -Parent $rutaDestino
New-Item -ItemType Directory -Path $carpetaDestino -Force | Out-Null
$claveRespaldo = Read-Host 'Contraseña de PostgreSQL (no se mostrará)' -AsSecureString
$claveTemporal = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($claveRespaldo)
$valorAnterior = $env:PGPASSWORD
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($claveTemporal)
  & pg_dump --format=custom --no-owner --no-acl --schema=public --schema=auth --file=$rutaDestino
  if ($LASTEXITCODE -ne 0) { throw 'Falló pg_dump. El archivo generado puede estar incompleto; no lo uses como respaldo válido.' }
  Write-Output "Respaldo terminado: $rutaDestino"
} finally {
  $env:PGPASSWORD = $valorAnterior
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($claveTemporal)
}
