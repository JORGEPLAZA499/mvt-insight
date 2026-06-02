import { scorePassword } from "@/lib/password-strength";

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;
  const { level, label, reasons, score } = scorePassword(password);

  const colorByLevel: Record<string, string> = {
    low: "bg-destructive",
    medium: "bg-warning",
    high: "bg-success",
    "very-high": "bg-success",
  };
  const textByLevel: Record<string, string> = {
    low: "text-destructive",
    medium: "text-warning",
    high: "text-success",
    "very-high": "text-success",
  };

  const segments = 4;
  const filled = level === "low" ? 1 : level === "medium" ? 2 : level === "high" ? 3 : 4;

  return (
    <div aria-live="polite" className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i < filled ? colorByLevel[level] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={textByLevel[level]}>Seguridad: {label}</span>
        {level === "low" && (
          <span className="text-muted-foreground">Mínimo requerido: Media</span>
        )}
      </div>
      {reasons.length > 0 && (
        <ul className="text-[11px] text-muted-foreground list-disc pl-4">
          {reasons.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
