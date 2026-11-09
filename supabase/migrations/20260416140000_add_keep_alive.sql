CREATE TABLE IF NOT EXISTS keep_alive (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insere o registro inicial (se não existir)
INSERT INTO keep_alive (id) VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Liberar acesso anônimo para atualização (apenas para este ID específico)
-- Assim o GitHub Action pode atualizar sem complicação
ALTER TABLE keep_alive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous update for keep_alive" ON keep_alive
FOR UPDATE USING (id = '00000000-0000-0000-0000-000000000000')
WITH CHECK (id = '00000000-0000-0000-0000-000000000000');

-- Permitir leitura também
CREATE POLICY "Allow public read for keep_alive" ON keep_alive
FOR SELECT USING (true);
