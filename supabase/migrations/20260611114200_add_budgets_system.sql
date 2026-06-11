-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: budget_templates
CREATE TABLE IF NOT EXISTS budget_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  niche text NOT NULL,
  title text NOT NULL,
  subtitle text,
  intro_text text,
  hero_badge text,
  portfolio_url text,
  whatsapp_message text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: budget_links
CREATE TABLE IF NOT EXISTS budget_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  template_id uuid REFERENCES budget_templates(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  client_name text,
  client_phone text,
  client_email text,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  expires_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_templates_niche ON budget_templates(niche);
CREATE INDEX IF NOT EXISTS idx_budget_links_token ON budget_links(token);
CREATE INDEX IF NOT EXISTS idx_budget_links_lead_id ON budget_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_budget_links_template_id ON budget_links(template_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_budget_templates_updated_at ON budget_templates;
CREATE TRIGGER trg_budget_templates_updated_at
BEFORE UPDATE ON budget_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_links ENABLE ROW LEVEL SECURITY;

-- Policies budget_templates
CREATE POLICY "Leitura publica de templates ativos" ON budget_templates
  FOR SELECT USING (is_active = true);

-- Assume que a manipulação de templates (admin) usa a service role pelo banco ou 
-- se o usuário for admin. Adicionaremos política para autenticados também.
CREATE POLICY "Admin total access budget_templates" ON budget_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies budget_links
CREATE POLICY "Leitura publica por token" ON budget_links
  FOR SELECT USING (true); -- o filtro é feito pelo token na query, não tem listagem pública

CREATE POLICY "Escrita para budget_links (update viewed_at) anon" ON budget_links
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admin total access budget_links" ON budget_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed Initial: Casamento
INSERT INTO budget_templates (name, slug, niche, title, subtitle, hero_badge, intro_text, portfolio_url, whatsapp_message, content)
VALUES (
  'Casamento',
  'casamento',
  'casamento',
  'Orçamento de Filmagem para Casamento',
  'Que essa memória seja eterna e emocionante.',
  'Blackboy Films | Casamentos',
  'O vídeo de casamento não é mais apenas um registro da cerimônia, dos noivos e dos convidados. Agora, é um filme que deve transmitir toda a emoção vivida naquele dia. Por isso, criamos opções cinematográficas, objetivas e compartilháveis para eternizar essa memória.',
  '',
  'Oi, {{client_name}}! Conforme conversamos, preparei uma proposta de filmagem para o seu casamento pela Blackboy Films. Você pode acessar aqui: {{budget_url}}',
  '{
    "sections": [
      {
        "type": "text",
        "title": "Que essa memória seja eterna",
        "body": "Neste mundo digitalizado, a tendência são filmes curtos, dinâmicos e compartilháveis. Por isso, sugerimos formatos como teaser, highlights e shortfilm."
      }
    ],
    "formats": [
      {
        "name": "Teaser",
        "description": "Vídeo de aproximadamente 1 minuto, ideal para compartilhar nas redes sociais."
      },
      {
        "name": "Highlights",
        "description": "Filme de aproximadamente 4 minutos para ser apreciado pelas pessoas mais próximas do casal."
      },
      {
        "name": "Shortfilm",
        "description": "Filme de 10 a 20 minutos, ideal para mostrar uma versão mais completa do casamento."
      }
    ],
    "packages": [
      {
        "id": "felizes-para-sempre",
        "name": "Felizes para Sempre",
        "tagline": "Não é apenas registro. É uma experiência cinematográfica completa.",
        "price": 6000,
        "featured": true,
        "items": [
          "02 profissionais",
          "Drone incluso",
          "Cobertura completa do evento: making of, cerimônia e festa",
          "Pré Wedding cinematográfico",
          "Direção estratégica de cenas",
          "Shortfilm cinematográfico de 10 a 20 minutos",
          "01 Highlights",
          "03 teasers verticais para redes sociais",
          "Streaming exclusivo para a noiva assistir em tempo real até sua entrada",
          "Tratamento de cor avançado e áudio refinado",
          "Entrega digital premium"
        ]
      },
      {
        "id": "eterno-amor",
        "name": "Eterno Amor",
        "tagline": "Para casais que querem algo mais elaborado e impactante.",
        "price": 4500,
        "featured": false,
        "items": [
          "02 profissionais",
          "Cobertura completa do evento: making of, cerimônia e festa",
          "Shortfilm cinematográfico de 10 a 20 minutos",
          "01 Highlights",
          "01 teaser curto vertical para redes sociais",
          "Tratamento de cor cinematográfico",
          "Entrega digital premium"
        ]
      },
      {
        "id": "memorias-eternas",
        "name": "Memórias Eternas",
        "tagline": "Registro bonito, objetivo e emocionante.",
        "price": 3000,
        "featured": false,
        "items": [
          "01 profissional",
          "Cobertura completa do evento: making of, cerimônia e festa",
          "Shortfilm cinematográfico de 10 a 20 minutos",
          "Highlights com melhores momentos",
          "Captação de áudio profissional",
          "Entrega digital em alta qualidade"
        ]
      }
    ],
    "addons": [
      {
        "name": "Drone",
        "price": 500
      },
      {
        "name": "StoryMaker",
        "price": 1200
      },
      {
        "name": "Pré Wedding",
        "price": 600
      }
    ]
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;
