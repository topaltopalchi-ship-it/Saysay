/// <reference types="vite/client" />
/**
 * Supabase email authentication helpers for Say Say.
 *
 * Used by the startup email/password gate and subscription requests.
 * Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the build environment.
 * Existing local PIN values are left untouched, and IndexedDB accounting data is
 * never cleared by authentication operations.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("تنظیمات اتصال به حساب آنلاین کامل نیست.");
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export async function signUpWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || password.length < 8) {
    throw new Error("ایمیل معتبر و رمز عبور حداقل ۸ کاراکتری وارد کنید.");
  }

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizedEmail,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );
  if (error) throw error;
  return data;
}

export async function signOutEmailAccount() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
  // Do not clear localStorage PIN or IndexedDB accounting records here.
}

export async function getEmailSession() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
}
