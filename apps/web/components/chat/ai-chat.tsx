"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, User, ArrowLeft } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  establishmentId: string;
  userRole: "admin" | "client";
  establishmentName?: string;
}

export function AIChat({ establishmentId, userRole, establishmentName }: AIChatProps) {
  const welcomeMessage =
    userRole === "admin"
      ? "Ciao! Sono il tuo assistente AI. Chiedimi qualsiasi cosa sullo stabilimento: prenotazioni, incassi, occupazione..."
      : establishmentName
        ? `Benvenuto su ${establishmentName}! Come posso aiutarti? Chiedimi disponibilità, prezzi o informazioni.`
        : "Benvenuto! Come posso aiutarti? Chiedimi disponibilità, prezzi o informazioni sullo stabilimento.";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Blocca scroll body su mobile quando aperta
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          establishmentId,
          role: userRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Mi dispiace, si è verificato un errore. Riprova tra qualche istante." },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Errore di connessione. Controlla la rete e riprova." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const headerTitle = userRole === "admin"
    ? "Assistente AI"
    : establishmentName
      ? `Assistente ${establishmentName}`
      : "Assistente";

  // ── Bottone flotante (chat chiusa) ─────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B1829] text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
        aria-label="Apri assistente"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  // ── Chat aperta ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay scuro su mobile */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 sm:hidden"
        onClick={() => setOpen(false)}
      />

      {/*
        Mobile  → full screen (fixed inset-0)
        Desktop → drawer bottom-right 420×620
      */}
      <div className="fixed inset-0 z-[61] flex flex-col bg-white dark:bg-zinc-950
                      sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[420px]
                      sm:rounded-2xl sm:shadow-2xl sm:border">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-3 bg-[#0B1829] px-4 py-3 text-white
                        sm:rounded-t-2xl">
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 sm:hidden"
            aria-label="Chiudi"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00BFFF]/20">
            <Bot className="h-5 w-5 text-[#00BFFF]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-sm">{headerTitle}</p>
            <p className="text-xs text-white/60">Online</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Messaggi ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00BFFF]/15 mb-0.5">
                  <Bot className="h-4 w-4 text-[#00BFFF]" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-[#0B1829] text-white"
                    : "rounded-bl-sm bg-zinc-100 dark:bg-zinc-800 text-foreground"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 mb-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Indicatore "sta scrivendo" */}
          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00BFFF]/15 mb-0.5">
                <Bot className="h-4 w-4 text-[#00BFFF]" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <form
          onSubmit={sendMessage}
          className="shrink-0 border-t bg-white dark:bg-zinc-950 px-3 py-3
                     sm:rounded-b-2xl"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Scrivi un messaggio..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-full border bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-[#00BFFF] focus:ring-2 focus:ring-[#00BFFF]/20 disabled:opacity-50 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B1829] text-white transition hover:bg-[#0B1829]/80 disabled:opacity-40 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
