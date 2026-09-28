import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const { t } = useTranslation();
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setVk((open) => !open)}
            className="h-8 w-8 text-muted-foreground"
            aria-label={t("a11y.virtualKeyboard")}
            aria-pressed={vk}
            title={t("a11y.virtualKeyboard")}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShow((s) => !s)}
            className="h-8 w-8 text-muted-foreground"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={show}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
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
