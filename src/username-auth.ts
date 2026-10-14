import { getSupabaseClient } from "./supabase-email-auth";

function normalizeUsername(username: string): string {
  const value = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(value)) {
    throw new Error("نام کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد یا زیرخط باشد.");
  }
  return value;
}

function internalEmail(username: string): string {
  return normalizeUsername(username) + "@username.saysay.invalid";
}

function makeRecoveryCode(): string {
  // UUID v4 provides 122 random bits; show the result once and ask the user to save it.
  return crypto.randomUUID();
}

export async function signUpWithUsername(username: string, password: string) {
  const normalized = normalizeUsername(username);
  if (password.length < 8 || password.length > 128) {
    throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد.");
  }
  const recoveryCode = makeRecoveryCode();
  const { error } = await getSupabaseClient().functions.invoke("username-signup", {
    body: { username: normalized, password, recoveryCode },
  });
  if (error) throw new Error("ثبت‌نام انجام نشد. اتصال سرور را بررسی کنید و دوباره تلاش کنید.");
  const { data, error: loginError } = await getSupabaseClient().auth.signInWithPassword({
    email: internalEmail(normalized), password,
  });
  if (loginError) throw new Error("حساب ساخته شد، اما ورود خودکار انجام نشد. با نام کاربری و رمز وارد شوید.");
  return { ...data, recoveryCode };
}

export async function signInWithUsername(username: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: internalEmail(username), password,
  });
  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      throw new Error("نام کاربری یا رمز عبور درست نیست.");
    }
    throw new Error("ورود انجام نشد. اتصال اینترنت را بررسی کنید.");
  }
  return data;
}

export async function resetPasswordWithRecovery(
  username: string,
  recoveryCode: string,
  newPassword: string,
) {
  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new Error("رمز جدید باید حداقل ۸ کاراکتر باشد.");
  }
  const newRecoveryCode = makeRecoveryCode();
  const { error } = await getSupabaseClient().functions.invoke("username-reset", {
    body: {
      username: normalizeUsername(username),
      recoveryCode: recoveryCode.trim(),
      newPassword,
      newRecoveryCode,
    },
  });
  if (error) {
    // A failed password update can exceptionally leave the new recovery hash active
    // if the server could not roll back. Preserve and show that credential to the user.
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { recoveryCode?: unknown; recoveryCodeRotated?: unknown };
        if (payload.recoveryCodeRotated === true && typeof payload.recoveryCode === "string") {
          return {
            recoveryCode: payload.recoveryCode,
            passwordChanged: false,
          };
        }
      } catch {
        // Fall through to the normal, non-sensitive error message.
      }
    }
    throw new Error("بازیابی انجام نشد. نام کاربری و کد بازیابی را بررسی کنید.");
  }
  return { recoveryCode: newRecoveryCode, passwordChanged: true };
}
