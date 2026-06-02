import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete, Shuffle, X, ArrowUp } from "lucide-react";

const DIGITS = "0123456789".split("");
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const SYMBOLS = "!@#$%&*()-_=+[]{};:,.?/".split("");

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}

export function VirtualKeyboard({ value, onChange, onClose }: Props) {
  const [shift, setShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [seed, setSeed] = useState(0);
  const [shuffled, setShuffled] = useState(true);

  // Re-baraja cuando cambia seed o el conjunto activo
  const digits = useMemo(
    () => (shuffled ? shuffle(DIGITS) : DIGITS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, shuffled],
  );
  const letters = useMemo(
    () => (shuffled ? shuffle(LETTERS) : LETTERS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, shuffled],
  );
  const symbols = useMemo(
    () => (shuffled ? shuffle(SYMBOLS) : SYMBOLS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, shuffled],
  );

  useEffect(() => {
    setSeed((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (ch: string) => {
    onChange(value + (shift ? ch.toUpperCase() : ch));
  };
  const backspace = () => onChange(value.slice(0, -1));

  const keyBtn = (label: string, onClick: () => void, extra = "") => (
    <button
      key={label + extra}
      type="button"
      onClick={onClick}
      className="h-9 min-w-[2.25rem] px-2 rounded-md border border-border bg-background hover:bg-accent text-sm font-mono transition select-none"
      aria-label={`Tecla ${label}`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-card p-3 shadow-lg"
      role="group"
      aria-label="Teclado virtual"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Teclado virtual {shuffled ? "(orden aleatorio)" : "(QWERTY)"}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShuffled((s) => !s)}
            className="text-[11px] px-2 py-1 rounded hover:bg-accent text-muted-foreground"
          >
            {shuffled ? "Orden normal" : "Aleatorio"}
          </button>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            aria-label="Reordenar teclas"
          >
            <Shuffle className="h-3 w-3" /> Reordenar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[11px] px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            aria-label="Cerrar teclado"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-1">
        {digits.map((d) => keyBtn(d, () => press(d)))}
      </div>

      {!showSymbols ? (
        <div className="flex flex-wrap gap-1">
          {letters.map((l) =>
            keyBtn(shift ? l.toUpperCase() : l, () => press(l)),
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {symbols.map((s) => keyBtn(s, () => onChange(value + s)))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        <button
          type="button"
          onClick={() => setShift((s) => !s)}
          className={`h-9 px-3 rounded-md border border-border text-xs inline-flex items-center gap-1 transition ${
            shift ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
          }`}
          aria-pressed={shift}
        >
          <ArrowUp className="h-3 w-3" /> Mayús
        </button>
        <button
          type="button"
          onClick={() => setShowSymbols((s) => !s)}
          className={`h-9 px-3 rounded-md border border-border text-xs transition ${
            showSymbols
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
          aria-pressed={showSymbols}
        >
          {showSymbols ? "ABC" : "#@!"}
        </button>
        <button
          type="button"
          onClick={() => onChange(value + " ")}
          className="flex-1 h-9 rounded-md border border-border bg-background hover:bg-accent text-xs"
        >
          Espacio
        </button>
        <button
          type="button"
          onClick={backspace}
          className="h-9 px-3 rounded-md border border-border bg-background hover:bg-accent text-xs inline-flex items-center gap-1"
          aria-label="Borrar último carácter"
        >
          <Delete className="h-3 w-3" /> Borrar
        </button>
      </div>
    </div>
  );
}
