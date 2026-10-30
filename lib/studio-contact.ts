export function getStudioWhatsAppHref(
  message: string,
  number: string | undefined = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "542212203747",
) {
  const digits = number?.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
