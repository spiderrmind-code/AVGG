# Registro temporal de riesgos de dependencias

Fecha de revisión: 2026-07-30

## Next.js 16.2.12: PostCSS y Sharp transitivos

| Advisory | Paquete afectado | Versión instalada | Exposición evaluada | Mitigación |
| --- | --- | --- | --- | --- |
| GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | `postcss` transitivo de Next | 8.4.31 | Solo build interno. La aplicación no acepta CSS, mapas de origen ni configuraciones PostCSS aportadas por usuarios. | Mantener CSS y configuración bajo control del repositorio; revisar al publicarse un parche estable de Next compatible. |
| GHSA-f88m-g3jw-g9cj | `sharp` opcional de Next | 0.34.5 | Optimización de imágenes de Next. Las URLs remotas están limitadas a hosts HTTPS explícitos y no existen cargas de imágenes de usuarios. | Mantener `remotePatterns` restringidos, sin SVG remoto ni IPs locales, y revisar al publicarse una actualización compatible de Next. |

Next 16.2.12 es la última versión estable disponible al momento de la revisión y fija `postcss@8.4.31` como dependencia interna y `sharp@^0.34.5` como opcional. No se usan overrides ni `npm audit fix`, porque el fix propuesto por npm implica un downgrade incompatible.

Condición de reapertura: nueva versión estable de Next que actualice estas dependencias, o incorporación de una entrada no confiable de CSS, source maps o imágenes.

Próxima revisión: al actualizar Next.js o antes del próximo despliegue de producción.
