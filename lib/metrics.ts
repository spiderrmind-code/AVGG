const counters = new Map<string, number>();
export function incrementMetric(name: string) { counters.set(name, (counters.get(name) ?? 0) + 1); }
export function recordMetric(name: string, value: number) { void name; void value; }
export function metricsSnapshot() { return Object.fromEntries(counters); }
