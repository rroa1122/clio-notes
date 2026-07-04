$filePath = "src/pages/Settings.tsx"

# Read as raw text with Windows-1252/ANSI to preserve the exact mangled character representations
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::GetEncoding(1252))

$replacements = @{
    'ConfiguraciÃ³n' = 'Configuración'
    'CONFIGURACIÃ“N' = 'CONFIGURACIÓN'
    'clÃ­nica' = 'clínica'
    'ClÃ­nica' = 'Clínica'
    'CLÃ“NICA' = 'CLÍNICA'
    'NavegaciÃ³n' = 'Navegación'
    'InformaciÃ³n' = 'Información'
    'SupervisiÃ³n' = 'Supervisión'
    'FacturaciÃ³n' = 'Facturación'
    'DirecciÃ³n' = 'Dirección'
    'TelÃ©fono' = 'Teléfono'
    'MÃ©todo' = 'Método'
    'IntegraciÃ³n' = 'Integración'
    'fÃ­sica' = 'física'
    'FÃ­sica' = 'Física'
    'NÃºmero' = 'Número'
    'TÃ­tulo' = 'Título'
    'MÃ¡x' = 'Máx'
    'Ã©xito' = 'éxito'
    'Â¡Plan' = '¡Plan'
    'Ã¡' = 'á'
    'Ã©' = 'é'
    'Ã­' = 'í'
    'Ã³' = 'ó'
    'Ãº' = 'ú'
    'Ã±' = 'ñ'
    'Ã“' = 'Ó'
    'Ã' = 'Á'
    'Â¡' = '¡'
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

# Write back as UTF-8 without BOM
[System.IO.File]::WriteAllText($filePath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Mangled characters fixed in $filePath!"
