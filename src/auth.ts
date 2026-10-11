const PIN_KEY = "sai-sai-pin";
const PBKDF2_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function cryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && Boolean(crypto.subtle) && typeof crypto.getRandomValues === "function";
}

async function derivePinHash(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export function hasPin(): boolean {
  return Boolean(localStorage.getItem(PIN_KEY));
}

export async function savePin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("رمز باید ۴ تا ۶ رقم باشد.");
  if (!cryptoAvailable()) throw new Error("امکان امن‌سازی رمز در این دستگاه فراهم نیست؛ برنامه را به‌روز یا دوباره باز کنید.");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePinHash(pin, salt);
  localStorage.setItem(PIN_KEY, `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`);
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;

  // Upgrade older versions that saved the PIN as plain text after a successful login.
  if (!stored.startsWith("pbkdf2-sha256$")) {
    if (stored !== pin) return false;
    await savePin(pin);
    return true;
  }

  if (!cryptoAvailable()) return false;
  const [algorithm, iterationsText, saltText, hashText] = stored.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !saltText || !hashText) {
    return false;
  }

  try {
    const expected = fromBase64(hashText);
    const actual = await derivePinHashWithIterations(pin, fromBase64(saltText), iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

async function derivePinHashWithIterations(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY);
}

export function authScreen(onSuccess: () => void): void {
  const existing = hasPin();
  const title = existing ? "ورود به سای‌سای" : "ساخت رمز ورود سای‌سای";
  const action = existing ? "ورود" : "ثبت رمز";

  document.querySelector("#auth-lock")?.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop";

  wrapper.innerHTML = `
    <section class="modal">
      <h2>${title}</h2>
      <p class="muted">
        ${existing
          ? "رمز ورود خود را وارد کنید."
          : "یک رمز ۴ تا ۶ رقمی برای محافظت از اطلاعات انتخاب کنید."}
      </p>
      <input
        id="auth-pin"
        type="password"
        inputmode="numeric"
        maxlength="6"
        placeholder="رمز ورود"
        autocomplete="off"
      />
      <p id="auth-error" class="muted" role="alert"></p>
      <button id="auth-submit" class="primary-button wide">
        ${action}
      </button>
    </section>
  `;

  document.body.appendChild(wrapper);

  const input = wrapper.querySelector<HTMLInputElement>("#auth-pin")!;
  const error = wrapper.querySelector<HTMLElement>("#auth-error")!;
  const button = wrapper.querySelector<HTMLButtonElement>("#auth-submit")!;

  const submit = async () => {
    if (button.disabled) return;
    const pin = input.value.trim();

    if (!/^\d{4,6}$/.test(pin)) {
      error.textContent = "رمز باید ۴ تا ۶ رقم باشد.";
      return;
    }

    button.disabled = true;
    try {
      if (existing && !(await checkPin(pin))) {
        error.textContent = "رمز واردشده اشتباه است یا امکان بررسی امن رمز فراهم نیست.";
        input.value = "";
        input.focus();
        return;
      }

      if (!existing) await savePin(pin);

      wrapper.remove();
      onSuccess();
    } catch {
      error.textContent = "ذخیره یا بررسی رمز ناموفق بود. دوباره تلاش کنید.";
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener("click", () => { void submit(); });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void submit();
  });

  input.focus();
}
