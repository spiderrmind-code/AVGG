export function maskOrderEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return undefined;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes(".")) return undefined;
  if (local.length === 1) return `*${email.slice(at)}`;
  if (local.length === 2) return `${local[0]}*${email.slice(at)}`;
  return `${local[0]}${"*".repeat(Math.max(3, local.length - 2))}${local.at(-1)}${email.slice(at)}`;
}
