UPDATE auth.users
SET encrypted_password = crypt('Junior88322512.', gen_salt('bf')),
    updated_at = now()
WHERE id = 'e56a6a80-3e6e-43a7-9907-052e8be73d6f';