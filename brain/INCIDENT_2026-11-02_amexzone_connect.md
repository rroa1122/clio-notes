# Incidente 2026-11-02 — Conexión con Amexzone siempre "EXPIRED"

Para Reinier y AG (Antigravity). Resuelto y desplegado en el commit `fix(bot): Amexzone connect failing as 'expired'...` (rama `feat/tcm-templates-v2`).

## Síntoma
En Clio > Sync, al darle "Connect Account" (Gisselle Rosales Martinez, `grmartinez2013@gmail.com`), la tarjeta quedaba siempre en **EXPIRED** con "Session expired. Please reconnect your account". Nunca llegaba a pedir el código 2FA.

## Causa
El error real estaba guardado en la tarea `[CONNECT]` de `amexzone_note_tasks.error_message` (no se mostraba en pantalla):

```
browserType.launchPersistentContext: Target page, context or browser has been closed
Looks like you launched a headed browser without having a XServer running.
Missing X server or $DISPLAY
```

- El bot abre Chrome **visible** (`headless: false`) sobre la pantalla virtual **Xvfb `:99`** del VPS (para poder mirarlo por VNC).
- **Xvfb no estaba corriendo** en el VPS (caído o no levantado tras un reinicio). Chrome moría al arrancar.
- `worker.js` marcaba `mfa_status = 'expired'` ante **cualquier** fallo del `[CONNECT]`, así que el problema del servidor se veía como "código vencido".
- Afectaba a todos los CMs y también al envío de notas (`progressNoteTask` usa el mismo Chrome visible).

Problemas encontrados de paso:
- El deploy (`.github/workflows/deploy.yml`) solo copiaba `worker.js` y `src/amexzone/`; **nunca copiaba `src/core/` ni `src/tasks/`**, así que los cambios en login/navegador/nota no llegaban al servidor.
- `worker.js`, si no podía leer las credenciales del usuario, **usaba la primera integración de la tabla (de otro usuario)**.
- La función de descifrado no devuelve `mfa_channel`: el bot siempre usaba SMS aunque se eligiera Email.
- El bot esperaba el código solo 4 minutos.
- Sync mostraba la contraseña de Amexzone **descifrada en claro**.

## Arreglo (desplegado)
| Archivo | Cambio |
|---|---|
| `amexzone-bot/src/core/browser.js` | Si no hay pantalla virtual (`/tmp/.X11-unix/X99`), abre Chrome en **headless**; si falla por "Missing X server", reintenta en headless. |
| `.github/workflows/deploy.yml` | Copia también `src/core/*.js` y `src/tasks/*.js`; levanta Xvfb `:99` si no está corriendo; reinicia `amexzone-worker`. |
| `amexzone-bot/worker.js` | Quitado el respaldo con credenciales de otro usuario. `[CONNECT]` fallido → `expired` solo si no llegó el código a tiempo; cualquier otro fallo → `not_connected`. |
| `amexzone-bot/src/core/authService.js` | Lee `mfa_channel` de la fila y lo respeta (SMS/Email). Espera el código 10 minutos. |
| `src/pages/SyncPortal.tsx` | Muestra el **motivo real** del último `[CONNECT]` fallido (navegador del servidor, código no recibido, email/contraseña rechazados, PIN). La contraseña guardada se muestra siempre enmascarada. |

Verificado: deploy OK, `amexzone-worker` online en PM2, Sync muestra "The bot browser could not start on the server..." para el intento viejo y la contraseña sale como `••••••••••••`.

## Pendiente / a revisar
1. **Reintentar la conexión de Gisselle** (le llegará el SMS a su teléfono; hay 10 min para poner el código en Clio).
2. **Confirmar en el VPS** que Xvfb quedó corriendo (`pgrep -x Xvfb`) y dejarlo como servicio (PM2 o systemd) para que vuelva solo tras un reinicio. Si `Xvfb` no está instalado, el bot igual funciona en headless.
3. **Seguridad — revisar en Supabase:** `get_decrypted_integration(target_user_id, secret_key)` se llama desde el navegador con una llave fija que va en el bundle público. La función debe comprobar `target_user_id = auth.uid()` (o ser solo `service_role`) para que nadie pueda descifrar la contraseña de otro CM. La versión del repo (`supabase_encrypt_credentials.sql`) tiene otra firma (1 parámetro) y no coincide con la desplegada.
4. Gisselle debería cambiar su contraseña de Amexzone: se vio en claro en una captura compartida.
