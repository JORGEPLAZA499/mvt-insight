import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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

const block = (e: React.SyntheticEvent) => e.preventDefault();

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
          onFocus={() => setVk(true)}
          placeholder={placeholder}
          readOnly={vk}
          inputMode="none"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onCopy={block}
          onCut={block}
          onPaste={block}
          onDrop={block}
          onContextMenu={block}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
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
        <VirtualKeyboard value={value} onChange={onChange} onClose={() => setVk(false)} />
      )}
    </div>
  );
}
