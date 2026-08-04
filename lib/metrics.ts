const counters = new Map<string, number>();
export function incrementMetric(name: string) { counters.set(name, (counters.get(name) ?? 0) + 1); }
export function recordMetric(_name: string, _value: number) { /* log/export hook reserved; in-memory metrics are intentionally non-persistent */ }
export function metricsSnapshot() { return Object.fromEntries(counters); }
