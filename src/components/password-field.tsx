import { useState } from "react";
import { Eye, EyeOff, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VirtualKeyboard } from "./virtual-keyboard";

interface Props {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: Props) {
  const [show, setShow] = useState(false);
  const [vk, setVk] = useState(false);

  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="text"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="pr-20"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <button
            type="button"
            onClick={() => setVk((open) => !open)}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition"
            aria-label="Teclado virtual"
            aria-pressed={vk}
            title="Teclado virtual"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={show}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {vk && (
        <div className="max-h-[52vh] overflow-auto">
          <VirtualKeyboard value={value} onChange={onChange} onClose={() => setVk(false)} />
        </div>
      )}
    </div>
  );
}
