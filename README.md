# Pixiv Popular Tag Filter

Extensión MV3 para Chrome que añade un panel a páginas de resultados de tags de Pixiv y ordena las obras por likes.

## Instalación

1. Descarga o clona este repositorio.
2. Abre `chrome://extensions/`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre una página de tag de Pixiv.

## Uso

- Configura los likes mínimos.
- Elige entre 1 y 10 páginas.
- Pulsa **Buscar populares**. Puedes cancelar el escaneo.
- Los detalles consultados se guardan en `chrome.storage.local` durante 24 horas.

## Endpoints internos

Los endpoints AJAX de Pixiv no son API oficiales y pueden cambiar. Comprueba las rutas y los campos marcados como `[no verificado]` en `constants.js` con DevTools → Network → Fetch/XHR. No se garantiza que los nombres de campos sigan vigentes.

La extensión usa la sesión ya iniciada en Pixiv; no solicita ni almacena credenciales.
