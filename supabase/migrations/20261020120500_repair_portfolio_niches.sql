-- =============================================================
-- Reparo de drift de schema
-- -------------------------------------------------------------
-- A migration 20260416134100_add_gtm_and_multi_niche.sql está
-- VAZIA no repositório, mas a coluna portfolio_items.niches e a
-- configuração tracking_gtm existem no banco de produção.
--
-- Resultado: um banco criado do zero não reproduzia produção e o
-- código não compilava (niches text[] ausente nos tipos).
--
-- Idempotente de propósito: em produção não altera nada.
-- =============================================================

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS niches text[] NOT NULL DEFAULT '{}';

-- Backfill a partir da coluna legada niche
UPDATE public.portfolio_items
SET niches = ARRAY[niche]
WHERE cardinality(niches) = 0
  AND niche IS NOT NULL
  AND niche <> '';

CREATE INDEX IF NOT EXISTS idx_portfolio_items_niches
  ON public.portfolio_items USING gin (niches);

-- Configuração de GTM (o app também cria on-demand)
INSERT INTO public.site_settings (key, value)
VALUES ('tracking_gtm', '{"enabled": false, "container_id": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
