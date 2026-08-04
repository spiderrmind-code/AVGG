const pattern = /^[a-zA-Z0-9_-]{8,80}$/;
export function requestIdFrom(request: Request): string { const value = request.headers.get("x-request-id")?.trim(); return value && pattern.test(value) ? value : crypto.randomUUID(); }
export function withRequestId(response: Response, requestId: string): Response { response.headers.set("x-request-id", requestId); return response; }
