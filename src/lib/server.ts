import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";
export function database() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw Error("Configure o Supabase para ativar a plataforma.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function mux() {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET)
    throw Error("Configure o Mux para enviar e reproduzir vídeos.");
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
    webhookSecret: process.env.MUX_WEBHOOK_SECRET,
  });
}
export function checked<T>(r: { data: T; error: any }): NonNullable<T> {
  if (r.error) throw Error(r.error.message);
  return r.data as NonNullable<T>;
}
