import type { LeadProfile, KarmaServiceSlug, LeadTemperature } from "./types";
import { buildCtas, scoreLead } from "./leadScoring";

export type RealtimeHandlers = {
  onState?: (state: "listening" | "thinking" | "speaking" | "error") => void;
  onTranscript?: (role: "kira" | "visitor", text: string) => void;
  onProfileUpdate?: (patch: Partial<LeadProfile>) => void;
  onTemperature?: (temperature: LeadTemperature) => void;
  onShowCtas?: (temperature: LeadTemperature) => void;
  onSubmitLead?: (payload: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    summary: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onEnd?: (farewell?: string) => void;
  onError?: (message: string) => void;
};

/**
 * Mic capture → OpenRouter transcription → chat → browser TTS.
 */
function forSpeech(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/[_#`>~]/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/%/g, " percent")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

const MALE_VOICE = /david|mark|ravi|george|daniel|james|thomas|richard|microsoft david|microsoft mark|microsoft ravi|alex(?!a)/i;
const FEMALE_VOICE =
  /female|zira|hazel|heera|aria|sonia|susan|samantha|karen|moira|tessa|veena|google us english|google uk english female|microsoft zira|microsoft hazel|microsoft heera|microsoft aria/i;

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;

  const english = voices.filter((v) => /^en/i.test(v.lang || ""));
  const pool = english.length ? english : voices;

  return (
    pool.find((v) => FEMALE_VOICE.test(`${v.name} ${v.lang}`) && !MALE_VOICE.test(v.name)) ||
    pool.find((v) => /zira|hazel|heera|aria|sonia/i.test(v.name)) ||
    pool.find((v) => !MALE_VOICE.test(v.name) && /en-IN|en-GB|en-US/i.test(v.lang)) ||
    pool.find((v) => !MALE_VOICE.test(v.name)) ||
    null
  );
}

function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis?.getVoices() || [];
    if (existing.length) {
      resolve();
      return;
    }
    const done = () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis?.addEventListener("voiceschanged", done);
    window.setTimeout(done, 800);
  });
}

export class KiraRealtimeSession {
  private handlers: RealtimeHandlers;
  private muted = false;
  private closed = false;
  private ready = false;
  private withMicrophone = false;
  private pathname = "/";
  private history: Array<{ role: string; content: string }> = [];
  private profile: LeadProfile = {};
  private speaking = false;
  private listenTimer: number | null = null;
  private liveStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private captureCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadTimer: number | null = null;
  private heardSpeech = false;
  private silentMs = 0;
  private recording = false;
  private transcribing = false;
  private recordStartedAt = 0;

  constructor(handlers: RealtimeHandlers = {}) {
    this.handlers = handlers;
  }

  get dataChannel() {
    return this.ready
      ? ({ readyState: "open" } as unknown as RTCDataChannel)
      : null;
  }

  get isReady() {
    return this.ready && !this.closed;
  }

  async connect(options: {
    pathname: string;
    withMicrophone: boolean;
  }): Promise<void> {
    this.closed = false;
    this.pathname = options.pathname;
    this.withMicrophone = options.withMicrophone;
    this.history = [];
    this.profile = { pagePath: options.pathname };

    const sessionRes = await fetch("/api/kira/session", { method: "POST" });
    const sessionData = await sessionRes.json().catch(() => ({}));
    if (!sessionRes.ok) {
      throw new Error(sessionData.error || "Failed to start session");
    }

    if (options.withMicrophone) {
      try {
        this.liveStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "Error";
        const msg = err instanceof Error ? err.message : "Microphone unavailable";
        const permission =
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          /permission|denied/i.test(msg);
        const wrapped = new Error(
          permission ? "Permission denied" : msg || "Could not access microphone"
        );
        wrapped.name = name;
        throw wrapped;
      }
      this.setupMicCapture();
    }

    this.ready = true;

    // Spoken / text greeting via OpenRouter
    await this.askModel("", true);
  }

  private setupMicCapture() {
    if (!this.liveStream) return;
    this.captureCtx = new AudioContext();
    const source = this.captureCtx.createMediaStreamSource(this.liveStream);
    this.analyser = this.captureCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
  }

  toggleListen() {
    if (this.closed || !this.withMicrophone) return;
    window.speechSynthesis?.cancel();
    this.speaking = false;
    this.handlers.onState?.("listening");
    this.startListening();
  }

  private scheduleListen(delay = 280) {
    if (this.listenTimer) window.clearTimeout(this.listenTimer);
    this.listenTimer = window.setTimeout(() => this.startListening(), delay);
  }

  private startListening() {
    if (
      this.closed ||
      this.muted ||
      this.speaking ||
      this.transcribing ||
      !this.withMicrophone ||
      !this.liveStream
    ) {
      return;
    }
    this.handlers.onState?.("listening");
    void this.captureCtx?.resume();
    this.startRecorder();
    this.startVad();
  }

  private startRecorder() {
    if (!this.liveStream || this.recording) return;
    this.chunks = [];
    this.heardSpeech = false;
    this.silentMs = 0;
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    try {
      this.recorder = new MediaRecorder(this.liveStream, { mimeType: mime });
    } catch {
      this.recorder = new MediaRecorder(this.liveStream);
    }
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(250);
    this.recording = true;
    this.recordStartedAt = Date.now();
  }

  private startVad() {
    if (this.vadTimer) window.clearInterval(this.vadTimer);
    const analyser = this.analyser;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    this.vadTimer = window.setInterval(() => {
      if (this.closed || this.muted || this.speaking || !this.recording || this.transcribing) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.018) {
        this.heardSpeech = true;
        this.silentMs = 0;
      } else if (this.heardSpeech) {
        this.silentMs += 80;
        if (this.silentMs >= 900) {
          void this.finishUtterance();
          return;
        }
      }
      if (this.heardSpeech && Date.now() - this.recordStartedAt >= 7000) {
        void this.finishUtterance();
      }
    }, 80);
  }

  private stopListening() {
    if (this.vadTimer) {
      window.clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
    if (this.recorder && this.recording) {
      try {
        if (this.recorder.state !== "inactive") this.recorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.recording = false;
  }

  private async finishUtterance() {
    if (this.transcribing || !this.heardSpeech) {
      this.stopListening();
      if (!this.closed && !this.muted && !this.speaking) this.scheduleListen(400);
      return;
    }
    this.transcribing = true;
    this.heardSpeech = false;
    if (this.vadTimer) {
      window.clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
    this.handlers.onState?.("thinking");

    const blob = await this.stopAndCollect();
    if (!blob || blob.size < 1200) {
      this.transcribing = false;
      this.startListening();
      return;
    }

    try {
      const form = new FormData();
      form.set("file", blob, "speech.webm");
      const res = await fetch("/api/kira/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      const text = String(data.text || "").trim();
      if (!res.ok || !text) {
        this.handlers.onError?.(data.error || "I didn't catch that. Tap Speak and try again.");
        this.transcribing = false;
        this.startListening();
        return;
      }
      this.transcribing = false;
      this.handlers.onTranscript?.("visitor", text);
      await this.askModel(text, false);
    } catch {
      this.transcribing = false;
      this.handlers.onError?.("Could not send your voice. You can type below.");
      this.startListening();
    }
  }

  private stopAndCollect(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") {
        this.recording = false;
        const blob = this.chunks.length
          ? new Blob(this.chunks, { type: recorder?.mimeType || "audio/webm" })
          : null;
        resolve(blob);
        return;
      }
      recorder.onstop = () => {
        this.recording = false;
        const blob = new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" });
        this.chunks = [];
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch {
        this.recording = false;
        resolve(null);
      }
    });
  }

  private async askModel(message: string, speakIntro: boolean) {
    this.handlers.onState?.("thinking");
    try {
      const res = await fetch("/api/kira/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: this.pathname,
          message,
          speakIntro,
          history: this.history,
          profile: this.profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Assistant failed to reply");
      }

      if (data.profileUpdate && typeof data.profileUpdate === "object") {
        this.applyProfile(data.profileUpdate as Partial<LeadProfile>);
      }

      const reply = String(data.reply || "").trim();
      if (!reply) throw new Error("Empty reply from model");

      // Free-router models sometimes emit safety classifier junk — ignore it.
      if (/^user safety:\s*safe\.?$/i.test(reply) || /^safety:\s*safe\.?$/i.test(reply)) {
        const fallback = "Hey, I'm Kira with KarmaKoders. What are you trying to get off the ground?";
        this.handlers.onTranscript?.("kira", fallback);
        await this.speak(fallback);
        return;
      }

      if (message) {
        this.history.push({ role: "user", content: message });
      }
      this.history.push({ role: "assistant", content: reply });
      this.handlers.onTranscript?.("kira", reply);
      await this.speak(forSpeech(reply));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Assistant failed";
      this.handlers.onError?.(msg);
      this.handlers.onState?.("error");
      if (this.withMicrophone && !this.muted) this.startListening();
    }
  }

  private applyProfile(patch: Partial<LeadProfile>) {
    this.profile = { ...this.profile, ...patch };
    this.handlers.onProfileUpdate?.(patch);
    if (patch.temperature) {
      this.handlers.onTemperature?.(patch.temperature);
      this.handlers.onShowCtas?.(patch.temperature);
    } else {
      const scored = scoreLead(this.profile);
      if (
        this.profile.projectType ||
        this.profile.problem ||
        this.profile.intent
      ) {
        this.profile.temperature = scored;
        this.handlers.onTemperature?.(scored);
        if (scored !== "EXPLORING") {
          this.handlers.onShowCtas?.(scored);
        }
      }
    }
    // Touch CTAs builder so service recommendations update links
    if (patch.primaryService || patch.temperature) {
      const temp =
        this.profile.temperature || scoreLead(this.profile);
      buildCtas(temp, this.profile);
    }
    if (patch.primaryService) {
      // ensure type stays valid
      void (patch.primaryService as KarmaServiceSlug);
    }
  }

  private async speak(text: string): Promise<void> {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      this.speaking = false;
      if (this.withMicrophone && !this.muted) this.scheduleListen(200);
      return;
    }

    await waitForVoices();
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.2;
    utter.lang = "en-US";
    const female = pickFemaleVoice();
    if (female) {
      utter.voice = female;
      if (female.lang) utter.lang = female.lang;
    }

    this.speaking = true;
    this.handlers.onState?.("speaking");

    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.speaking = false;
        window.clearTimeout(safety);
        if (this.withMicrophone && !this.muted && !this.closed) {
          this.scheduleListen(450);
        }
        resolve();
      };

      const safety = window.setTimeout(finish, Math.min(12000, 1800 + text.length * 80));
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);

      // Chrome can pause TTS in the background; keep it alive.
      window.setTimeout(() => {
        if (!finished && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 250);
    });
  }

  sendText(text: string) {
    if (!this.isReady) {
      throw new Error("Conversation is not connected yet.");
    }
    this.stopListening();
    this.handlers.onTranscript?.("visitor", text);
    void this.askModel(text, false);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopListening();
      window.speechSynthesis?.cancel();
    } else if (this.withMicrophone && !this.speaking) {
      this.startListening();
    }
  }

  isMuted() {
    return this.muted;
  }

  async close() {
    this.closed = true;
    this.ready = false;
    if (this.listenTimer) window.clearTimeout(this.listenTimer);
    this.stopListening();
    try {
      await this.captureCtx?.close();
    } catch {
      /* ignore */
    }
    this.captureCtx = null;
    this.analyser = null;
    this.liveStream?.getTracks().forEach((t) => t.stop());
    this.liveStream = null;
    window.speechSynthesis?.cancel();
  }
}
