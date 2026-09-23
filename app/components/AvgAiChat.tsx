"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, Send, ShoppingBag, Sparkles, Square, Volume2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { PLACEHOLDER_IMAGE } from "@/app/constants/placeholder";
import { formatARS } from "@/lib/currency";
import type { AiCartProduct, AiChatMessage, AiConversationState } from "@/lib/ai/types";
import type { PublicProduct } from "@/lib/catalog";

type ChatMessage = AiChatMessage & {
  id: string;
  products?: PublicProduct[];
  canConfirm?: boolean;
};

type ChatApiResponse = {
  success?: boolean;
  message?: string;
  reply?: string;
  products?: PublicProduct[];
  conversation?: AiConversationState;
  cartProduct?: AiCartProduct;
  checkout?: boolean;
  cart?: boolean;
};

const initialMessage: ChatMessage = {
  id: "avg-ai-welcome",
  role: "assistant",
  content: "Dale, decime qué estás buscando y te ayudo a encontrarlo.",
};

type SpeechRecognitionEventLike = Event & { results: { [index: number]: { [index: number]: { transcript: string } } }; resultIndex: number };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor() {
  const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProduct(value: unknown): value is PublicProduct {
  return isRecord(value)
    && typeof value._id === "string"
    && typeof value.name === "string"
    && typeof value.price === "number"
    && typeof value.inStock === "boolean";
}

function parseResponse(value: unknown): ChatApiResponse | null {
  if (!isRecord(value)) return null;
  return {
    success: value.success === true,
    ...(typeof value.message === "string" ? { message: value.message } : {}),
    ...(typeof value.reply === "string" ? { reply: value.reply } : {}),
    ...(Array.isArray(value.products) ? { products: value.products.filter(isProduct) } : {}),
    ...(isRecord(value.conversation) ? { conversation: value.conversation as AiConversationState } : {}),
    ...(isRecord(value.cartProduct) && isProduct(value.cartProduct) ? { cartProduct: value.cartProduct as AiCartProduct } : {}),
    ...(value.checkout === true ? { checkout: true } : {}),
    ...(value.cart === true ? { cart: true } : {}),
  };
}

function productImage(product: PublicProduct) {
  return product.image || product.images?.[0] || PLACEHOLDER_IMAGE;
}

export default function AvgAiChat() {
  const { addToCart } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<AiConversationState>({});
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function nextMessageId(prefix: string) {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  }

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  async function sendMessage(rawMessage: string, selectionProductId?: string) {
    const content = rawMessage.trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = {
      id: nextMessageId("user"),
      role: "user",
      content,
    };
    const history = messages.slice(-8).map(({ role, content: previousContent }) => ({ role, content: previousContent }));
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history,
          conversation,
          ...(selectionProductId ? { selectionProductId } : {}),
        }),
      });
      const payload = parseResponse(await response.json().catch(() => null));
      if (!response.ok || !payload?.success || !payload.reply || !payload.conversation) {
        throw new Error(payload?.message || "No pude procesar eso ahora.");
      }

      const reply = payload.reply;
      const nextConversation = payload.conversation;

      if (payload.cartProduct) {
        const product = payload.cartProduct;
        addToCart({
          _id: product._id,
          slug: product.slug ?? undefined,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          image: product.image || PLACEHOLDER_IMAGE,
          inStock: product.inStock === true,
          stockQuantity: product.stockQuantity,
        });
      }

      if (payload.checkout) router.push("/checkout");
      if (payload.cart) router.push("/cart");

      setConversation(nextConversation);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId("assistant"),
          role: "assistant",
          content: reply,
          products: payload.products,
          canConfirm: Boolean(nextConversation.pendingConfirmationProductId),
        },
      ]);
    } catch (error) {
      const content = error instanceof Error && error.message ? error.message : "No pude procesar eso ahora.";
      setMessages((current) => [
        ...current,
        { id: nextMessageId("assistant-error"), role: "assistant", content },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function selectProduct(product: PublicProduct) {
    void sendMessage(`Me gusta ${product.name}.`, product._id);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    if (loading || listening) return;
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setVoiceError("Tu navegador no permite dictado por voz. Podés escribir tu mensaje.");
      return;
    }
    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (transcript) void sendMessage(transcript);
      else setVoiceError("No llegué a escuchar nada. Probá de nuevo.");
    };
    recognition.onerror = (event) => {
      const messagesByError: Record<string, string> = {
        "not-allowed": "No tengo permiso para usar el micrófono.",
        "service-not-allowed": "El reconocimiento de voz no está disponible ahora.",
        "no-speech": "No detecté voz. Probá de nuevo.",
        aborted: "",
      };
      setVoiceError(messagesByError[event.error ?? ""] ?? "No pude reconocer tu voz. Probá de nuevo.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("No pude iniciar el micrófono. Probá de nuevo.");
    }
  }

  function speakMessage(message: ChatMessage) {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Tu navegador no permite reproducir respuestas por voz.");
      return;
    }
    window.speechSynthesis.cancel();
    if (speakingId === message.id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = "es-AR";
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => { setSpeakingId(null); setVoiceError("No pude reproducir esa respuesta."); };
    setSpeakingId(message.id);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[60] sm:bottom-5 sm:right-5">
      {open ? (
        <section
          id="avg-ai-chat"
          role="dialog"
          aria-modal="false"
          aria-label="AVG AI"
          className="ui-popover mb-3 flex h-[min(42rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[25rem] flex-col overflow-hidden bg-[color:var(--color-surface-strong)] sm:h-[min(42rem,calc(100vh-8rem))]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent-strong)] text-white dark:bg-white dark:text-neutral-950">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-text)]">AVG AI</p>
                <p className="text-xs text-[color:var(--color-text-muted)]">Encuentra productos reales para vos</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="ui-icon-button h-9 min-h-9 w-9 min-w-9" aria-label="Cerrar AVG AI">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user"
                    ? "max-w-[85%] rounded-[1.1rem] rounded-br-sm bg-[color:var(--color-accent-strong)] px-3.5 py-2.5 text-sm leading-5 text-white dark:bg-white dark:text-neutral-950"
                    : "max-w-[92%] rounded-[1.1rem] rounded-bl-sm bg-[color:var(--color-surface-muted)] px-3.5 py-2.5 text-sm leading-5 text-[color:var(--color-text)]"}>
                    <div className="flex items-start gap-2"><span className="min-w-0 flex-1">{message.content}</span>{message.role === "assistant" ? <button type="button" onClick={() => speakMessage(message)} className="shrink-0 text-[color:var(--color-text-muted)]" aria-label={speakingId === message.id ? "Detener respuesta por voz" : "Escuchar respuesta"}>{speakingId === message.id ? <Square className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}</button> : null}</div>
                  </div>
                </div>
              ))}

              {messages.map((message) => message.products?.length ? (
                <div key={`${message.id}-products`} className="grid gap-2">
                  {message.products.map((product) => (
                    <article key={product._id} className="ui-card flex gap-3 p-2.5">
                      <Link href={`/product/${encodeURIComponent(product._id)}`} className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.8rem] bg-[color:var(--color-surface-muted)]" aria-label={`Ver ${product.name}`}>
                        <Image src={productImage(product)} alt="" fill sizes="72px" className="object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-semibold leading-4 text-[color:var(--color-text)]">{product.name}</p>
                        <p className="mt-1 text-sm font-bold text-[color:var(--color-text)]">{formatARS(product.price)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`text-[11px] font-medium ${product.inStock ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]"}`}>{product.inStock ? "Disponible" : "Sin stock"}</span>
                          {product.inStock ? (
                            message.canConfirm && conversation.pendingConfirmationProductId === product._id ? (
                              <button type="button" onClick={() => void sendMessage("Sí, agregalo.")} disabled={loading} className="ml-auto text-xs font-semibold text-[color:var(--color-accent-strong)] underline underline-offset-2 dark:text-white">Agregar</button>
                            ) : (
                              <button type="button" onClick={() => selectProduct(product)} disabled={loading} className="ml-auto text-xs font-semibold text-[color:var(--color-accent-strong)] underline underline-offset-2 dark:text-white">Elegir</button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null)}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-[1.1rem] rounded-bl-sm bg-[color:var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[color:var(--color-text-muted)]">Buscando en el catálogo…</div>
                </div>
              ) : null}
              <div ref={scrollTargetRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-3">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={600}
              disabled={loading}
              placeholder="¿Qué estás buscando?"
              className="ui-input min-w-0 flex-1 rounded-full px-4"
              aria-label="Mensaje para AVG AI"
            />
            <button type="button" onClick={listening ? stopListening : startListening} disabled={loading} className={`ui-icon-button h-11 min-h-11 w-11 min-w-11 rounded-full ${listening ? "bg-[color:var(--color-danger)] text-white" : ""}`} aria-label={listening ? "Detener dictado" : "Hablar con AVG AI"} aria-pressed={listening}>
              {listening ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="submit" disabled={loading || !draft.trim()} className="ui-button-primary h-11 min-h-11 w-11 min-w-11 rounded-full p-0" aria-label="Enviar mensaje">
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          {voiceError ? <p role="status" className="shrink-0 px-4 pb-3 text-xs text-[color:var(--color-text-muted)]">{voiceError}</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="avg-ai-chat"
        className="group flex h-14 items-center gap-2 rounded-full bg-[color:var(--color-accent-strong)] px-4 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:bg-neutral-950 dark:bg-white dark:text-neutral-950 dark:hover:bg-zinc-200"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
        <span>AVG AI</span>
        {!open ? <ShoppingBag className="h-4 w-4 opacity-70" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
