# Pixiv Popular Tag Filter

Extensión MV3 para Chrome que añade un panel a páginas de resultados de tags de Pixiv y ordena las obras por número de likes.

## Instalación

1. Descarga o clona este repositorio.
2. Abre `chrome://extensions/`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre una página de tag de Pixiv.

## Uso

- Configura el número mínimo de likes.
- Elige entre 1 y 10 páginas para analizar.
- Pulsa **Buscar populares**. Puedes cancelar el escaneo.
- Las obras que cumplen el mínimo se ordenan de mayor a menor según `body.likeCount`.
- Los detalles consultados se guardan en `chrome.storage.local` durante 24 horas para reducir solicitudes repetidas.

## Respuestas de Pixiv verificadas

Las respuestas observadas en DevTools muestran:

- Búsqueda: `body.illustManga.data`, con campos `id`, `title` y `url`.
- Detalle de una obra: `body.likeCount`, `body.bookmarkCount` y `body.viewCount`; la extensión usa `likeCount` para ordenar.

Los endpoints AJAX son internos de Pixiv, no una API oficial, y pueden cambiar. La extensión utiliza la sesión ya iniciada en Pixiv; no solicita ni almacena credenciales.

## Diagnóstico

Si Pixiv cambia el formato o limita las solicitudes, revisa DevTools → Network → Fetch/XHR y vuelve a cargar la extensión desde `chrome://extensions/`. Si aparece HTTP 429, espera antes de iniciar otro escaneo.
