import { Capacitor, registerPlugin } from "@capacitor/core";

type VoskStartOptions = { prompt?: string; language?: string; maxResults?: number; partialResults?: boolean; popup?: boolean };
type VoskResult = { text: string };
type ModelProgress = { status: string; percent?: number; downloadedBytes?: number; totalBytes?: number; message?: string };
type VoskPlugin = {
  prepare(): Promise<void>;
  requestPermissions(): Promise<{ granted: boolean }>;
  isListening(): Promise<{ listening: boolean }>;
  start(options?: VoskStartOptions): Promise<VoskResult>;
  stop(): Promise<void>;
  addListener(eventName: "modelDownloadProgress", listenerFunc: (progress: ModelProgress) => void): Promise<{ remove: () => Promise<void> }>;
};

/** Persian offline speech recognition. Intentionally has no Android speech-service fallback. */
const NativeVosk = registerPlugin<VoskPlugin>("VoskSpeechRecognition");


function showModelProgress(progress: ModelProgress): void {
  if (!Capacitor.isNativePlatform()) return;
  let panel = document.getElementById("saisai-model-download");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "saisai-model-download";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = '<div class="saisai-model-head"><strong>آماده‌سازی گفتار فارسی</strong><span id="saisai-model-percent">۰٪</span></div><p id="saisai-model-status">در حال آماده‌سازی…</p><div class="saisai-model-track"><div id="saisai-model-bar"></div></div>';
    document.body.appendChild(panel);
  }
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)));
  const percentEl = panel.querySelector<HTMLElement>("#saisai-model-percent");
  const statusEl = panel.querySelector<HTMLElement>("#saisai-model-status");
  const bar = panel.querySelector<HTMLElement>("#saisai-model-bar");
  if (percentEl) percentEl.textContent = percent.toLocaleString("fa-IR") + "٪";
  if (bar) bar.style.width = percent + "%";
  const messages: Record<string, string> = {
    downloading: "در حال دانلود مدل فارسی…",
    extracting: "دانلود تمام شد؛ در حال آماده‌سازی مدل…",
    ready: "مدل فارسی آماده است و می‌توانید از گفتار آفلاین استفاده کنید.",
    error: progress.message || "دانلود مدل انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید."
  };
  if (statusEl) statusEl.textContent = messages[progress.status] || "در حال آماده‌سازی مدل فارسی…";
  panel.dataset.status = progress.status;
  if (progress.status === "ready") {
    if (bar) bar.style.width = "100%";
    if (percentEl) percentEl.textContent = "۱۰۰٪";
    window.setTimeout(() => panel?.remove(), 6000);
  }
}

export async function prepareVoskModel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeVosk.addListener("modelDownloadProgress", showModelProgress);
    await NativeVosk.prepare();
  } catch (error) {
    showModelProgress({ status: "error", message: error instanceof Error ? error.message : "دانلود مدل فارسی انجام نشد. اتصال اینترنت را بررسی کنید." });
  }
}

if (Capacitor.isNativePlatform()) void prepareVoskModel();

export const SpeechRecognition = {
  async available(): Promise<{ available: boolean }> {
    return { available: Capacitor.isNativePlatform() };
  },
  async requestPermissions(): Promise<{ speechRecognition: string }> {
    const result = await NativeVosk.requestPermissions();
    return { speechRecognition: result.granted ? "granted" : "denied" };
  },
  isListening(): Promise<{ listening: boolean }> {
    return NativeVosk.isListening();
  },
  async start(options: VoskStartOptions = {}): Promise<{ matches: string[] }> {
    const result = await NativeVosk.start(options);
    return { matches: result.text?.trim() ? [result.text.trim()] : [] };
  },
  stop(): Promise<void> {
    return NativeVosk.stop();
  },
};
