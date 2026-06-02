// Función pura: puntúa una contraseña y devuelve un nivel.
// Compartida entre cliente y servidor.

export type StrengthLevel = "low" | "medium" | "high" | "very-high";

export interface StrengthResult {
  score: number; // 0..7
  level: StrengthLevel;
  label: string;
  reasons: string[];
}

export function scorePassword(pwd: string): StrengthResult {
  const reasons: string[] = [];
  let score = 0;

  if (pwd.length >= 8) score++;
  else reasons.push("Mínimo 8 caracteres");
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;

  if (/[a-z]/.test(pwd)) score++;
  else reasons.push("Añade una minúscula");
  if (/[A-Z]/.test(pwd)) score++;
  else reasons.push("Añade una mayúscula");
  if (/[0-9]/.test(pwd)) score++;
  else reasons.push("Añade un número");
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  // Penalizar secuencias triviales / repeticiones
  const lower = pwd.toLowerCase();
  if (/(.)\1{2,}/.test(lower)) {
    score = Math.max(0, score - 1);
    reasons.push("Evita caracteres repetidos");
  }
  if (
    /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|erty|asdf|zxcv)/.test(
      lower,
    )
  ) {
    score = Math.max(0, score - 1);
    reasons.push("Evita secuencias predecibles");
  }

  let level: StrengthLevel;
  let label: string;
  if (score <= 3) {
    level = "low";
    label = "Baja";
  } else if (score <= 4) {
    level = "medium";
    label = "Media";
  } else if (score <= 5) {
    level = "high";
    label = "Alta";
  } else {
    level = "very-high";
    label = "Muy alta";
  }

  return { score, level, label, reasons };
}

export function isAcceptableStrength(pwd: string): boolean {
  const { level } = scorePassword(pwd);
  return level !== "low";
}
