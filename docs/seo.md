# SEO

AVG Connects define metadata global, `metadataBase`, Open Graph y Twitter en el layout. Las páginas de producto y categoría generan metadata dinámica y canonical público. `robots.txt` bloquea rutas privadas y el sitemap incluye únicamente rutas públicas, categorías y productos activos.

El layout publica JSON-LD de Organization, Store y WebSite; la ficha de producto publica Product y BreadcrumbList sin campos internos de costos o proveedores. `npm run verify:seo` valida estos contratos estáticos.

Limitaciones: la indexación, las vistas previas sociales y los datos estructurados deben verificarse nuevamente sobre el dominio final y con Search Console; no es una garantía de posicionamiento.
