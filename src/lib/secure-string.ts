// Buffer ofuscado en memoria. Almacena cada code-point XOR-eado con una clave
// aleatoria de sesión. NO es cifrado real (un atacante con acceso al heap puede
// leer también la clave), pero evita que la contraseña aparezca como string
// plano en snapshots de memoria o devtools del estado de React.

export interface SecureBuffer {
  append(ch: string): void;
  pop(): void;
  clear(): void;
  reveal(): string;
  readonly length: number;
}

export function createSecureBuffer(): SecureBuffer {
  let codes: number[] = [];
  let keys: number[] = [];

  return {
    append(ch: string) {
      for (const c of ch) {
        const code = c.codePointAt(0)!;
        const k = Math.floor(Math.random() * 0xffff);
        codes.push(code ^ k);
        keys.push(k);
      }
    },
    pop() {
      codes.pop();
      keys.pop();
    },
    clear() {
      // Sobrescribe antes de descartar
      for (let i = 0; i < codes.length; i++) {
        codes[i] = 0;
        keys[i] = 0;
      }
      codes = [];
      keys = [];
    },
    reveal() {
      let out = "";
      for (let i = 0; i < codes.length; i++) {
        out += String.fromCodePoint(codes[i] ^ keys[i]);
      }
      return out;
    },
    get length() {
      return codes.length;
    },
  };
}
