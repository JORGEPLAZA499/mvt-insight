import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [shift, setShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [seed, setSeed] = useState(0);
  const [shuffled, setShuffled] = useState(true);

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
    if (shuffled) setSeed((s) => s + 1);
  };
  const backspace = () => {
    onChange(value.slice(0, -1));
    if (shuffled) setSeed((s) => s + 1);
  };

  const keyBtn = (label: string, onClick: () => void, extra = "") => (
    <button
      key={label + extra}
      type="button"
      onClick={onClick}
      className="h-14 sm:h-12 w-full rounded-lg border border-border bg-background hover:bg-accent active:bg-accent active:scale-95 text-lg sm:text-base font-semibold shadow-sm transition select-none"
      aria-label={t("a11y.key", { label })}
    >
      {label}
    </button>
  );

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-card p-5 sm:p-4 shadow-lg"
      role="group"
      aria-label={t("a11y.virtualKeyboard")}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium tracking-wide text-muted-foreground">
          Teclado virtual de seguridad
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShuffled((s) => !s)}
            className="text-xs sm:text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
          >
            {shuffled ? t("a11y.normalOrder") : t("a11y.random")}
          </button>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="inline-flex items-center gap-1 text-xs sm:text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            aria-label={t("a11y.reorderKeys")}
          >
            <Shuffle className="h-4 w-4 sm:h-4 sm:w-4" /> {t("a11y.reorder")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-xs sm:text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            aria-label={t("a11y.closeKeyboard")}
          >
            <X className="h-4 w-4 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2 sm:gap-1.5 mb-2">
        {digits.map((d) => keyBtn(d, () => press(d)))}
      </div>

      {!showSymbols ? (
        <div className="grid grid-cols-13 gap-2 sm:gap-1.5" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
          {letters.map((l) =>
            keyBtn(shift ? l.toUpperCase() : l, () => press(l)),
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-1.5" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
          {symbols.map((s) => keyBtn(s, () => onChange(value + s)))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 sm:gap-1.5 mt-3">
        <button
          type="button"
          onClick={() => setShift((s) => !s)}
          className={`h-14 sm:h-12 px-4 sm:px-3 rounded-lg border border-border text-base sm:text-sm font-semibold inline-flex items-center gap-1 shadow-sm active:scale-95 transition ${
            shift ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
          }`}
          aria-pressed={shift}
        >
          <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" /> {t("a11y.shift")}
        </button>
        <button
          type="button"
          onClick={() => setShowSymbols((s) => !s)}
          className={`h-14 sm:h-12 px-4 sm:px-3 rounded-lg border border-border text-base sm:text-sm font-semibold shadow-sm active:scale-95 transition ${
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
          className="flex-1 h-14 sm:h-12 rounded-lg border border-border bg-background hover:bg-accent active:scale-95 text-base sm:text-sm font-semibold shadow-sm transition"
        >
          {t("a11y.space")}
        </button>
        <button
          type="button"
          onClick={backspace}
          className="h-14 sm:h-12 px-4 sm:px-3 rounded-lg border border-border bg-background hover:bg-accent active:scale-95 text-base sm:text-sm font-semibold shadow-sm inline-flex items-center gap-1 transition"
          aria-label={t("a11y.deleteLast")}
        >
          <Delete className="h-5 w-5 sm:h-4 sm:w-4" /> {t("a11y.delete")}
        </button>
      </div>
    </div>
  );
}
