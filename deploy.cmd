@echo off
echo ===========================================
echo   DESPLEGANDO CLIO EOB (VITE FRONTEND)
echo ===========================================
echo.

echo [1/4] Compilando el proyecto...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo Error en la compilacion. Despliegue cancelado.
    exit /b %errorlevel%
)

echo.
echo [2/4] Comprimiendo archivos de distribucion...
powershell -Command "Compress-Archive -Path dist\* -DestinationPath ..\clio-notes-deploy.zip -Force"
if %errorlevel% neq 0 (
    echo Error al comprimir archivos.
    exit /b %errorlevel%
)

echo.
echo [3/4] Subiendo paquete al servidor...
scp -i C:\Users\REINIER\.ssh\id_rsa_clinicflow -o StrictHostKeyChecking=no ..\clio-notes-deploy.zip root@clinicflow.dev:/var/www/
if %errorlevel% neq 0 (
    echo Error al subir el archivo al servidor.
    exit /b %errorlevel%
)

echo.
echo [4/4] Descomprimiendo en el servidor y reiniciando Caddy...
ssh -i C:\Users\REINIER\.ssh\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "unzip -o /var/www/clio-notes-deploy.zip -d /var/www/clionotes/ ; rm -f /var/www/clio-notes-deploy.zip ; docker restart caddy"
if %errorlevel% neq 0 (
    echo Error al descomprimir en el servidor.
    exit /b %errorlevel%
)

echo.
echo ===========================================
echo   DESPLIEGUE FINALIZADO EXITOSAMENTE!
echo   Verifica en: https://eob.clinicflow.dev
echo ===========================================
