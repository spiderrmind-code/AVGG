import type { AiProvider, AiProviderInput, AiProviderIntent } from "@/lib/ai/types";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_TERM_LENGTH = 48;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function compactText(value: string, maximum: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function asTextList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const terms = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => compactText(item, MAX_TERM_LENGTH))
    .filter(Boolean)
    .slice(0, 8);
  return terms.length ? [...new Set(terms)] : undefined;
}

function asShortText(value: unknown, maximum = MAX_TERM_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = compactText(value, maximum);
  return result || undefined;
}

function parseIntent(raw: string): AiProviderIntent {
  try {
    const parsed: unknown = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const value = parsed as Record<string, unknown>;
    const maxPrice = typeof value.maxPrice === "number" && Number.isFinite(value.maxPrice) && value.maxPrice > 0 && value.maxPrice <= 20_000_000
      ? Math.floor(value.maxPrice)
      : undefined;
    const action = value.action === "search" || value.action === "alternative" || value.action === "checkout" || value.action === "cart"
      ? value.action
      : undefined;
    return {
      ...(asTextList(value.keywords) ? { keywords: asTextList(value.keywords) } : {}),
      ...(asShortText(value.category) ? { category: asShortText(value.category) } : {}),
      ...(asShortText(value.color) ? { color: asShortText(value.color) } : {}),
      ...(maxPrice ? { maxPrice } : {}),
      ...(action ? { action } : {}),
    };
  } catch {
    return {};
  }
}

export class GeminiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractIntent(input: AiProviderInput): Promise<AiProviderIntent> {
    const contents = [
      ...input.history.slice(-6).map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: compactText(message.content, 300) }],
      })),
      { role: "user", parts: [{ text: compactText(input.message, 600) }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Sos el analizador conversacional de AVG Connects. Respondé exclusivamente JSON válido, sin markdown, con {keywords:string[], category?:string, color?:string, maxPrice?:number, action?:'search'|'alternative'|'checkout'|'cart'}. Usá el historial y criteria para conservar el contexto. action='alternative' si pide algo parecido, más barato o considera caro lo seleccionado; checkout si quiere pagar/finalizar; cart si pregunta o quiere ir al carrito; search para una búsqueda. Extraé sólo preferencias expresadas o inequívocamente implicadas. maxPrice debe estar en ARS entero. Nunca inventes productos, marcas, precios, stock o características. No incluyas saludos ni explicaciones.",
            }],
          },
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 180,
          },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) throw new Error("Gemini no pudo interpretar la consulta");
    const payload = await response.json() as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini respondió sin intención");
    return parseIntent(text);
  }
}

export function createAiProvider(): AiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? new GeminiProvider(apiKey) : null;
}
