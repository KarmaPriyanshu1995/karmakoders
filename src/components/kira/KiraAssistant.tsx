"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  X,
  MessageSquareText,
  PhoneOff,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KiraRealtimeSession } from "@/lib/kira/realtimeClient";
import { buildCtas, scoreLead } from "@/lib/kira/leadScoring";
import type {
  KiraCta,
  KiraUiState,
  LeadProfile,
  LeadTemperature,
  TranscriptLine,
} from "@/lib/kira/types";
import { SERVICE_LABELS } from "@/lib/kira/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function KiraAssistant() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [uiState, setUiState] = useState<KiraUiState>("idle");
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<LeadProfile>({});
  const [ctas, setCtas] = useState<KiraCta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const sessionRef = useRef<KiraRealtimeSession | null>(null);
  const profileRef = useRef<LeadProfile>({});
  const textHistoryRef = useRef<Array<{ role: string; content: string }>>([]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const statusLabel = useMemo(() => {
    switch (uiState) {
      case "listening":
        return "Listening";
      case "thinking":
        return "Thinking";
      case "speaking":
        return "Speaking";
      case "error":
        return "Something went wrong";
      case "ended":
        return "Conversation ended";
      default:
        return started ? "Ready" : "Idle";
    }
  }, [uiState, started]);

  const pushTranscript = useCallback((role: "kira" | "visitor", text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === clean) return prev;
      return [...prev, { id: uid(), role, text: clean, at: Date.now() }];
    });
    textHistoryRef.current.push({
      role: role === "kira" ? "assistant" : "user",
      content: clean,
    });
  }, []);

  const submitLead = useCallback(
    async (payload: {
      name: string;
      email: string;
      company?: string;
      phone?: string;
      summary: string;
    }) => {
      const merged: LeadProfile = {
        ...profileRef.current,
        ...payload,
        pagePath: pathname,
        temperature: profileRef.current.temperature || scoreLead({
          ...profileRef.current,
          ...payload,
        }),
      };

      const res = await fetch("/api/kira/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: merged }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error || "Failed to submit" };
      }
      if (data.ctas) setCtas(data.ctas);
      pushTranscript("kira", data.message || "Details sent to the team.");
      return { ok: true, message: data.message };
    },
    [pathname, pushTranscript]
  );

  const endSession = useCallback(async (farewell?: string) => {
    if (farewell) pushTranscript("kira", farewell);
    await sessionRef.current?.close();
    sessionRef.current = null;
    setStarted(false);
    setUiState("ended");
    setMuted(false);
  }, [pushTranscript]);

  const createSession = useCallback(() => {
    return new KiraRealtimeSession({
      onState: (s) => setUiState(s),
      onTranscript: pushTranscript,
      onProfileUpdate: (patch) => {
        setProfile((prev) => ({ ...prev, ...patch, pagePath: pathname }));
      },
      onTemperature: (temperature) => {
        setProfile((prev) => ({ ...prev, temperature }));
      },
      onShowCtas: (temperature) => {
        setProfile((prev) => {
          const next = { ...prev, temperature };
          setCtas(buildCtas(temperature, next));
          return next;
        });
      },
      onSubmitLead: submitLead,
      onEnd: (farewell) => {
        void endSession(farewell);
      },
      onError: (message) => {
        setError(message);
        setUiState("error");
      },
    });
  }, [endSession, pathname, pushTranscript, submitLead]);

  const startConversation = useCallback(
    async (preferred: "voice" | "text") => {
      if (!consentChecked) {
        setError("Please confirm you’re okay talking with an AI assistant.");
        return;
      }
      setError(null);
      setBusy(true);
      setMode(preferred);
      setUiState("thinking");
      setCtas([]);

      const isPermissionError = (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : "";
        return (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          /permission|notallowed|denied/i.test(msg)
        );
      };

      try {
        await sessionRef.current?.close();
        const session = createSession();
        sessionRef.current = session;

        if (preferred === "voice") {
          try {
            await session.connect({ pathname, withMicrophone: true });
            setMode("voice");
            setStarted(true);
            setUiState("listening");
          } catch (micErr) {
            // Mic blocked — still connect so Kira can SPEAK; visitor types (or enables mic later).
            if (!isPermissionError(micErr)) throw micErr;

            await sessionRef.current?.close();
            const speakSession = createSession();
            sessionRef.current = speakSession;
            await speakSession.connect({ pathname, withMicrophone: false });
            setMode("text");
            setMuted(true);
            setError(
              "Microphone is blocked. In the address bar, click the lock/mic icon → Allow microphone, then tap Enable mic. Kira can still talk — type to reply for now."
            );
            setStarted(true);
            setUiState("speaking");
          }
        } else {
          try {
            await session.connect({ pathname, withMicrophone: false });
            setStarted(true);
            setUiState("speaking");
          } catch {
            sessionRef.current = null;
            const greet =
              "Hey, I'm Kira with KarmaKoders. What are you trying to get off the ground?";
            pushTranscript("kira", greet);
            setUiState("idle");
            setStarted(true);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not start the conversation.";
        setError(`${message} You can still type below.`);
        sessionRef.current = null;
        const greet =
              "Hey, I'm Kira with KarmaKoders. What are you trying to get off the ground?";
        pushTranscript("kira", greet);
        setMode("text");
        setStarted(true);
        setUiState("idle");
      } finally {
        setBusy(false);
      }
    },
    [consentChecked, createSession, pathname, pushTranscript]
  );

  const enableMicrophone = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      // Fresh permission probe (helps after user changes Chrome site settings)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());

      await sessionRef.current?.close();
      const session = createSession();
      sessionRef.current = session;
      await session.connect({ pathname, withMicrophone: true });
      setMode("voice");
      setMuted(false);
      setUiState("listening");
      setError(null);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const message =
        err instanceof Error ? err.message : "Could not enable microphone.";
      const isPermission =
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        /permission|denied|notallowed/i.test(message);

      if (isPermission) {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "this site";
        setError(
          `Microphone is still blocked for ${origin}. In Chrome: click the lock/tune icon in the address bar → Site settings → Microphone → Allow. Then click Reload below. (Allowing mic for a different URL like localhost vs 172.x.x.x does not count.)`
        );
      } else {
        setError(message);
      }
      setUiState("error");
    } finally {
      setBusy(false);
    }
  }, [createSession, pathname]);

  const sendText = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    pushTranscript("visitor", text);
    setBusy(true);
    setUiState("thinking");

    try {
      if (sessionRef.current?.isReady) {
        sessionRef.current.sendText(text);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/kira/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname,
          message: text,
          history: textHistoryRef.current.slice(0, -1),
          profile: profileRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");

      if (data.profileUpdate) {
        setProfile((prev) => {
          const next = { ...prev, ...data.profileUpdate, pagePath: pathname };
          if (data.profileUpdate.temperature) {
            setCtas(buildCtas(data.profileUpdate.temperature, next));
          }
          return next;
        });
      }
      pushTranscript("kira", data.reply);
      setUiState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setUiState("error");
    } finally {
      setBusy(false);
    }
  }, [busy, input, pathname, pushTranscript]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.close();
    };
  }, []);

  // Auto-open welcome panel once per tab (browsers still require a click to start audio/mic).
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kira_auto_opened") === "1") return;
    const t = window.setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem("kira_auto_opened", "1");
    }, 1800);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const temperature = profile.temperature;

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-[80] group flex items-center gap-3 rounded-full border border-white/10 bg-[#1C1B1A]/95 pl-2 pr-5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:border-[#FFC300]/40 transition-colors"
            aria-label="Open Kira, KarmaKoders"
          >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#FFC300] text-[#1C1B1A]">
              <Sparkles className="h-5 w-5" />
              <span className="absolute inset-0 rounded-full bg-[#FFC300]/40 animate-ping opacity-30" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-white leading-tight">
                Talk to Kira
              </span>
              <span className="block text-[11px] text-[#A39F97] leading-tight">
                KarmaKoders
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-5 right-5 z-[90] w-[min(100vw-1.5rem,400px)] max-h-[min(86vh,640px)] flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#252422] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            role="dialog"
            aria-label="Kira, KarmaKoders"
          >
            <div className="relative px-5 pt-5 pb-4 border-b border-white/8 bg-gradient-to-b from-[#2c2a27] to-[#252422]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-[#FFC300] text-[#1C1B1A] flex items-center justify-center font-black text-lg tracking-tight">
                      K
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#252422]",
                        uiState === "listening" && "bg-emerald-400 animate-pulse",
                        uiState === "speaking" && "bg-[#FFC300] animate-pulse",
                        uiState === "thinking" && "bg-sky-400 animate-pulse",
                        uiState === "error" && "bg-rose-500",
                        uiState === "ended" && "bg-[#A39F97]",
                        (uiState === "idle" || !started) && "bg-[#A39F97]"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold leading-tight">Kira</p>
                    <p className="text-xs text-[#A39F97] leading-tight mt-0.5">
                      KarmaKoders
                    </p>
                    <p className="text-[11px] text-[#FFC300]/90 mt-1 font-medium tracking-wide uppercase">
                      {statusLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void endSession();
                    setOpen(false);
                  }}
                  className="rounded-xl p-2 text-[#A39F97] hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Close Kira"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {(uiState === "listening" || uiState === "speaking" || uiState === "thinking") && (
                <div className="mt-4 flex items-end gap-1 h-8 px-1">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="flex-1 rounded-full bg-[#FFC300]/80"
                      animate={{
                        height:
                          uiState === "thinking"
                            ? [6, 14, 6]
                            : uiState === "listening"
                              ? [8, 22, 10, 18, 8]
                              : [10, 26, 12, 20, 10],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: uiState === "thinking" ? 1.1 : 0.7,
                        delay: i * 0.04,
                        ease: "easeInOut",
                      }}
                      style={{ height: 8 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!started ? (
                <div className="space-y-4">
                  <p className="text-white text-[15px] leading-relaxed">
                    Hi — I&apos;m Kira with KarmaKoders. Tell me what you want to build.
                  </p>
                  <p className="text-sm text-[#A39F97] leading-relaxed">
                    Tap <span className="text-white">Start conversation</span>, then choose{" "}
                    <span className="text-white">Allow</span> when Chrome asks for the microphone.
                    Browsers cannot start voice automatically without that click. After she talks, hold the yellow mic and speak.
                  </p>
                  <label className="flex items-start gap-2.5 text-xs text-[#A39F97] leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 accent-[#FFC300]"
                    />
                    <span>
                      I understand I&apos;m talking with an AI assistant. Conversation details
                      are only sent to KarmaKoders if I choose to share a lead.{" "}
                      <Link href="/privacy" className="text-[#FFC300] underline underline-offset-2">
                        Privacy
                      </Link>
                    </span>
                  </label>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void startConversation("voice")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFC300] text-[#1C1B1A] font-semibold py-3 px-4 hover:brightness-105 disabled:opacity-60 transition"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                      Start conversation
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void startConversation("text")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 text-white font-medium py-3 px-4 hover:bg-white/5 disabled:opacity-60 transition"
                    >
                      <MessageSquareText className="h-4 w-4 text-[#FFC300]" />
                      Type instead
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {showTranscript && (
                    <div className="space-y-3">
                      {transcript.length === 0 && (
                        <p className="text-sm text-[#A39F97]">Conversation starting…</p>
                      )}
                      {transcript.map((line) => (
                        <div
                          key={line.id}
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[92%]",
                            line.role === "kira"
                              ? "bg-white/[0.04] border border-white/8 text-white"
                              : "ml-auto bg-[#FFC300]/15 border border-[#FFC300]/25 text-white"
                          )}
                        >
                          <p className="text-[10px] uppercase tracking-wider text-[#A39F97] mb-1">
                            {line.role === "kira" ? "Kira" : "You"}
                          </p>
                          {line.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {(profile.primaryService || temperature) && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-[#A39F97] space-y-1">
                      {profile.name && (
                        <p>
                          <span className="text-white/80">Visitor:</span> {profile.name}
                          {profile.company ? ` · ${profile.company}` : ""}
                        </p>
                      )}
                      {profile.primaryService && (
                        <p>
                          <span className="text-white/80">Suggested:</span>{" "}
                          {SERVICE_LABELS[profile.primaryService]}
                          {profile.secondaryService
                            ? ` + ${SERVICE_LABELS[profile.secondaryService]}`
                            : ""}
                        </p>
                      )}
                      {temperature && (
                        <p>
                          <span className="text-white/80">Intent:</span> {temperature}
                        </p>
                      )}
                    </div>
                  )}

                  {ctas.length > 0 && (
                    <div className="grid gap-2">
                      {ctas.map((cta) => (
                        <Link
                          key={cta.href + cta.label}
                          href={cta.href}
                          className="rounded-xl border border-[#FFC300]/30 bg-[#FFC300]/10 px-3 py-2.5 text-sm font-semibold text-[#FFC300] text-center hover:bg-[#FFC300]/20 transition"
                        >
                          {cta.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="space-y-2">
                  <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 leading-relaxed">
                    {error}
                  </p>
                  {/microphone|permission|mic|blocked/i.test(error) && (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void enableMicrophone()}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFC300]/35 bg-[#FFC300]/10 px-3 py-2 text-sm font-semibold text-[#FFC300] hover:bg-[#FFC300]/20 disabled:opacity-60"
                      >
                        <Mic className="h-4 w-4" />
                        Try mic again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") window.location.reload();
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
                      >
                        Reload page
                      </button>
                      <p className="text-[10px] text-[#A39F97] leading-relaxed px-1">
                        Tip: open the site as{" "}
                        <span className="text-white">http://localhost:3000</span>{" "}
                        (not a LAN IP), set Microphone to Allow for that exact URL, then Reload.
                        You can keep typing meanwhile.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {started && uiState !== "ended" && (
              <div className="border-t border-white/8 p-3 space-y-2 bg-[#1C1B1A]/60">
                {mode === "voice" && (
                  <button
                    type="button"
                    disabled={muted || busy}
                    onClick={() => {
                      sessionRef.current?.toggleListen();
                      setUiState("listening");
                    }}
                    className={cn(
                      "w-full rounded-2xl py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 select-none",
                      uiState === "listening"
                        ? "bg-[#FFC300] text-[#1C1B1A]"
                        : "bg-[#FFC300]/15 text-[#FFC300] border border-[#FFC300]/35"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                    {uiState === "listening" ? "Listening… just speak" : "Tap to speak"}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      sessionRef.current?.setMuted(next);
                    }}
                    className="rounded-xl p-2.5 border border-white/10 text-[#A39F97] hover:text-white hover:bg-white/5"
                    aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                    disabled={mode === "text" && !sessionRef.current}
                  >
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTranscript((v) => !v)}
                    className="rounded-xl p-2.5 border border-white/10 text-[#A39F97] hover:text-white hover:bg-white/5"
                    aria-label="Toggle transcript"
                  >
                    <MessageSquareText className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void endSession("Thanks for chatting — feel free to explore the site anytime.")}
                    className="rounded-xl p-2.5 border border-white/10 text-[#A39F97] hover:text-rose-300 hover:bg-rose-500/10"
                    aria-label="End conversation"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </button>
                  <div className="flex-1" />
                  <span className="text-[10px] text-[#A39F97] uppercase tracking-wider">
                    {mode === "voice" ? "Speak after she talks" : "Text mode"}
                  </span>
                </div>

                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendText();
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-[#A39F97]/70 focus:outline-none focus:border-[#FFC300]/40"
                    aria-label="Message Kira"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="rounded-xl bg-[#FFC300] text-[#1C1B1A] p-2.5 disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
