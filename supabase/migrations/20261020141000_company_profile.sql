-- =============================================================
-- Dados da empresa (usados em propostas, contratos e no rodapé)
-- Ficam em site_settings para poderem ser editados sem deploy.
-- =============================================================

INSERT INTO public.site_settings (key, value)
VALUES (
  'company',
  '{
    "legal_name": "Blackboy Films",
    "document": "41.260.784/0001-74",
    "email": "blackboyfilms@hotmail.com",
    "phone": "(45) 99827-2361",
    "address": "Rua Marechal Deodoro, 1563",
    "city": "Cascavel",
    "state": "PR",
    "site": "blackboyfilms.com.br"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
