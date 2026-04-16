-- Migration para criar tabela de keep-alive para evitar pausa do Supabase (Free Tier)
CREATE TABLE IF NOT EXISTS keep_alive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ping_status TEXT DEFAULT 'ok'
);

-- Habilitar RLS
ALTER TABLE keep_alive ENABLE ROW LEVEL SECURITY;

-- Política para permitir que o service_role gerencie tudo (padrão do Supabase)
-- Não criaremos políticas públicas, pois o script usará a SERVICE_ROLE_KEY
