import { createModel } from "vosk-browser";

type VoskModel = Awaited<ReturnType<typeof createModel>>;
let modelPromise: Promise<VoskModel> | null = null;

async function getModel(onStatus?: (message: string) => void): Promise<VoskModel> {
  if (!modelPromise) {
    onStatus?.("Downloading English Vosk model (about 40 MB)...");
    const modelUrl = new URL("models/vosk-en.tar.gz", import.meta.env.BASE_URL).href;
    modelPromise = createModel(modelUrl).catch(error => {
      modelPromise = null;
      throw error;
    });
  }
  const model = await modelPromise;
  onStatus?.("English Vosk model is ready");
  return model;
}

/** Offline-in-browser English recognition. Microphone audio is processed locally by Vosk WASM. */
export async function listenWithVoskEnglish(
  onStatus?: (message: string) => void,
  maxListenMs = 12000,
): Promise<string> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access requires a secure browser context (HTTPS).");
  }

  const model = await getModel(onStatus);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    video: false,
  });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  let transcript = "";
  let quietTimer: ReturnType<typeof setTimeout> | undefined;
  let hardTimer: ReturnType<typeof setTimeout> | undefined;

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (quietTimer) clearTimeout(quietTimer);
      if (hardTimer) clearTimeout(hardTimer);
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach(track => track.stop());
      recognizer.remove();
      void audioContext.close();
    };
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value.trim());
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    recognizer.on("result", message => {
      const text = (message as { result: { text: string } }).result.text?.trim();
      if (text) transcript = text;
      if (transcript) finish(transcript);
    });
    recognizer.on("partialresult", message => {
      const partial = (message as { result: { partial: string } }).result.partial?.trim();
      if (partial) {
        transcript = partial;
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(() => finish(transcript), 1800);
      }
    });
    recognizer.on("error", message => fail(new Error((message as { error: string }).error || "Vosk recognition error")));

    processor.onaudioprocess = event => {
      try {
        recognizer.acceptWaveform(event.inputBuffer);
      } catch (error) {
        fail(error);
      }
    };
    source.connect(processor);
    processor.connect(audioContext.destination);
    hardTimer = setTimeout(() => finish(transcript), maxListenMs);
    void audioContext.resume().catch(fail);
  });
}
