# Performance

Las imágenes usan `next/image` y los hosts remotos se restringen mediante `remotePatterns`. `priority` se reserva para imágenes de contenido principal; el resto conserva carga diferida por defecto. Las listas administrativas usan paginación con límites máximos y las rutas privadas no deben declararse públicas en caché.

`npm run verify:performance` revisa las restricciones de imágenes y la paginación administrativa. La medición de bundle se mantiene en el build de Next.

Pendientes externos: ejecutar Lighthouse sobre el dominio real y medir Core Web Vitals luego del despliegue. Aún no hay métricas de campo.
