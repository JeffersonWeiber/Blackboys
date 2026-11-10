-- Atualiza o telefone de contato da empresa usado em propostas, contratos e no site.
UPDATE public.site_settings
SET value = jsonb_set(value, '{phone}', to_jsonb('(45) 99955-3429'::text), true),
    updated_at = now()
WHERE key = 'company';
