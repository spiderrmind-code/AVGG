# Permisos administrativos

Las rutas admin validan sesión y rol server-side; el rol, actor y datos enviados por frontend no se consideran autoridad. Las escrituras de estado individual validan Origin/CSRF y rate limit. Los errores HTTP relevantes son 401 (sin sesión), 403 (sin permiso/origen), 400 (identificador o entrada inválida), 404 y 429.
