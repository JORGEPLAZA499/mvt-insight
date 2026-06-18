## Recarga de créditos

Usuario encontrado: `5SZ-UU2-KH3` (id `c8c6518a-bebe-4247-ba54-c1dec71f6309`), saldo actual: **5 créditos**.

### Acción
Sumar 2.000 créditos → saldo final: **2.005 créditos**.

### SQL
```sql
UPDATE public.accounts
SET credits = credits + 2000
WHERE user_code = '5SZ-UU2-KH3';

INSERT INTO public.credit_recharges (user_id, credits, ...)  -- si aplica para historial
```

Verificaré primero columnas de `credit_recharges` para registrar la recarga manual si corresponde, y luego confirmaré el nuevo saldo con un SELECT.
