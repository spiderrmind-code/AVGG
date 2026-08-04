# Backups y restore MongoDB

Configurar backups Atlas externamente; este repositorio no afirma que estén activos. Objetivo operativo: RPO 24 h y RTO 4 h, sujetos al plan Atlas y a un restore drill. Usar snapshots con retención acordada, backup manual sólo con autorización y restore primero en entorno alternativo. Validar colecciones, índices, conteos y health/readiness; documentar rollback antes de promover. Los dry-runs no crean dumps ni restauran datos.
