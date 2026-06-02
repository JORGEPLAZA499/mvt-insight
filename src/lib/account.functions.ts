import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Alfabeto sin caracteres ambiguos (sin O/0/I/1)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_REGEX = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/;

function generateCode(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const chars: string[] = [];
  for (let i = 0; i < 9; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  return `${chars.slice(0, 3).join("")}-${chars.slice(3, 6).join("")}-${chars.slice(6, 9).join("")}`;
}

function codeToEmail(code: string): string {
  return `${code.replace(/-/g, "").toLowerCase()}@mvt-accounts.local`;
}

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128)
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[0-9]/, "Debe incluir un número");

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) =>
    z.object({ password: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    // Generar código único (reintenta hasta 5 veces si colisiona)
    let code = "";
    let email = "";
    let userId = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      email = codeToEmail(code);
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
      });
      if (!error && created.user) {
        userId = created.user.id;
        break;
      }
      // Si el email ya existe (colisión), reintenta con otro código
      if (error && /already|exists|registered/i.test(error.message)) continue;
      if (error) throw new Error(`No se pudo crear la cuenta: ${error.message}`);
    }
    if (!userId) throw new Error("No se pudo generar un código único. Intenta de nuevo.");

    const { error: insertError } = await supabaseAdmin
      .from("accounts")
      .insert({ id: userId, user_code: code });

    if (insertError) {
      // Rollback: borra el usuario auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Error al guardar la cuenta: ${insertError.message}`);
    }

    return { code, email };
  });

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    const normalized = input.code.trim().toUpperCase();
    if (!CODE_REGEX.test(normalized)) {
      throw new Error("Formato de código inválido. Debe ser XXX-XXX-XXX.");
    }
    return { code: normalized };
  })
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("accounts")
      .select("id, user_code")
      .eq("user_code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      // No revelamos si existe o no — mensaje genérico
      throw new Error("Código o contraseña incorrectos.");
    }
    return { email: codeToEmail(row.user_code) };
  });

export const touchLastLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("accounts")
      .select("user_code, created_at, last_login_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
