import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export async function scanBarcode(): Promise<string | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("دسترسی دوربین در این محیط فعال نیست. برنامه را از نسخه نصب‌شده سای‌سای باز کنید و Android System WebView را به‌روز کنید.");
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:20000;background:#111e;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto";
  overlay.innerHTML = '<section style="background:white;color:#222;border-radius:16px;padding:16px;width:min(100%,480px);max-height:calc(100dvh - 24px);overflow:auto"><h3>اسکن بارکد کالا</h3><p style="font-size:13px;color:#555">بارکد را واضح و نزدیک دوربین نگه دارید؛ نور کافی باشد.</p><video playsinline webkit-playsinline autoplay muted style="display:block;width:100%;height:auto;min-height:180px;max-height:55dvh;object-fit:contain;background:#222;border-radius:12px"></video><p class="barcode-scan-status" role="status" aria-live="polite" style="font-size:13px;color:#555">در حال درخواست دسترسی دوربین…</p><button type="button" class="secondary-button wide">بستن</button></section>';
  document.body.appendChild(overlay);

  const video = overlay.querySelector("video")!;
  const status = overlay.querySelector<HTMLElement>(".barcode-scan-status")!;
  let stopScanner: (() => void) | undefined;
  let active = true;
  let resolveResult!: (value: string | null) => void;
  const result = new Promise<string | null>(resolve => { resolveResult = resolve; });

  const close = (value: string | null) => {
    if (!active) return;
    active = false;
    try { stopScanner?.(); } catch { /* Scanner may already have stopped. */ }
    const stream = video.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    video.pause();
    video.srcObject = null;
    overlay.remove();
    resolveResult(value);
  };

  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
    BarcodeFormat.ITF, BarcodeFormat.QR_CODE, BarcodeFormat.CODABAR,
  ]);
  const reader = new BrowserMultiFormatReader(hints as Map<DecodeHintType, any>, {
    delayBetweenScanAttempts: 180,
    delayBetweenScanSuccess: 250,
  });

  overlay.querySelector("button")?.addEventListener("click", () => close(null));

  try {
    // Ask for camera access first. Android WebView can report an empty device list
    // until permission has been granted, so enumerate cameras only afterwards.
    const permissionStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    const preferredDeviceId = permissionStream.getVideoTracks()[0]?.getSettings().deviceId;
    permissionStream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput");
    const rearCamera = cameras.find(device => /back|rear|environment|پشت|عقب/i.test(device.label));
    const deviceId = preferredDeviceId || rearCamera?.deviceId || cameras[0]?.deviceId;

    if (!deviceId) throw new Error("دوربین پیدا نشد. دسترسی دوربین را در تنظیمات گوشی فعال کنید.");

    status.textContent = "دوربین آماده شد؛ بارکد را داخل کادر نگه دارید.";
    await reader.decodeFromVideoDevice(deviceId, video, (decoded, _error, controls) => {
      stopScanner = () => controls.stop();
      if (decoded && active) {
        const value = decoded.getText().trim();
        if (value) close(value);
      }
    });
    if (active) {
      await video.play().catch(() => undefined);
      status.textContent = "دوربین فعال است؛ بارکد را داخل کادر نگه دارید.";
    }
  } catch (error) {
    const err = error as DOMException;
    const message = error instanceof Error ? error.message : "";
    close(null);
    if (err?.name === "NotAllowedError" || /permission denied|permission dismissed/i.test(message)) {
      throw new Error("اجازه دوربین داده نشد. از تنظیمات گوشی، دسترسی دوربین برنامه سای‌سای را فعال کنید و دوباره امتحان کنید.");
    }
    if (err?.name === "NotFoundError" || /دوربین پیدا نشد/i.test(message)) {
      throw new Error("دوربین پیدا نشد یا در دسترس نیست.");
    }
    if (err?.name === "NotReadableError") {
      throw new Error("دوربین در حال استفاده توسط برنامه دیگری است. آن برنامه را ببندید و دوباره تلاش کنید.");
    }
    throw new Error(message || "اسکنر شروع نشد. دسترسی دوربین را بررسی کنید و دوباره تلاش کنید.");
  }

  return result;
}
