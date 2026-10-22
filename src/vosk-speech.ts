import { Capacitor, registerPlugin } from "@capacitor/core";

type VoskStartOptions = { prompt?: string };
type VoskResult = { text: string };
type VoskPlugin = {
  requestPermissions(): Promise<{ granted: boolean }>;
  isListening(): Promise<{ listening: boolean }>;
  start(options?: VoskStartOptions): Promise<VoskResult>;
  stop(): Promise<void>;
};

/** Persian offline speech recognition. Intentionally has no Android speech-service fallback. */
const NativeVosk = registerPlugin<VoskPlugin>("VoskSpeechRecognition");

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
