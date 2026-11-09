-- =============================================================
-- FASE 1 — Fundação de dados
-- -------------------------------------------------------------
-- 1. clients passa a ser "conta comercial": cliente OU parceiro
-- 2. projects (o trabalho) entre cliente e proposta
-- 3. activities (timeline / trilha de auditoria)
-- 4. proposals (budget_links) ganha versão + snapshot imutável
-- 5. RPCs públicas para o link da proposta
-- 6. Correção de RLS (vazamento de dados de clientes / escrita anon)
-- =============================================================

-- -------------------------------------------------------------
-- 1) CLIENTS
-- -------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS show_on_site boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS niche_id uuid REFERENCES public.niches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Cliente de serviço pode não ter logo; só a parede do site exige
ALTER TABLE public.clients ALTER COLUMN logo_url DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_status_check') THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_status_check CHECK (status IN ('ativo', 'inativo', 'legado'));
  END IF;
END $$;

-- Preserva a parede de logos atual (o que era "featured" vira "aparece no site")
UPDATE public.clients
SET show_on_site = true
WHERE show_on_site = false
  AND is_featured = true
  AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_show_on_site ON public.clients(show_on_site) WHERE show_on_site = true;
CREATE INDEX IF NOT EXISTS idx_clients_origin_lead ON public.clients(origin_lead_id);

-- -------------------------------------------------------------
-- 1b) PARTNERS — entidade SEPARADA de cliente.
--     Parceiro = indicação, permuta, fornecedor, cerimonialista.
--     Não tem contrato, não tem projeto, não entra em faturamento.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade_name text,
  logo_url text,
  website_url text,
  category text,
  contact_name text,
  email text,
  phone text,
  partnership_type text NOT NULL DEFAULT 'indicacao',
  commission_notes text,
  notes text,
  status text NOT NULL DEFAULT 'ativo',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_partnership_type_check') THEN
    ALTER TABLE public.partners
      ADD CONSTRAINT partners_partnership_type_check
      CHECK (partnership_type IN ('indicacao', 'permuta', 'fornecedor', 'cerimonial', 'outro'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_status_check') THEN
    ALTER TABLE public.partners
      ADD CONSTRAINT partners_status_check CHECK (status IN ('ativo', 'inativo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partners(partnership_type);

DROP TRIGGER IF EXISTS trg_partners_updated_at ON public.partners;
CREATE TRIGGER trg_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and editor can view partners" ON public.partners;
CREATE POLICY "Admin and editor can view partners"
  ON public.partners FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can insert partners" ON public.partners;
CREATE POLICY "Admin and editor can insert partners"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can update partners" ON public.partners;
CREATE POLICY "Admin and editor can update partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Only admin can delete partners" ON public.partners;
CREATE POLICY "Only admin can delete partners"
  ON public.partners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------------
-- 2) PROJECTS — a unidade operacional (um job por projeto)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  niche_id uuid REFERENCES public.niches(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_date date,
  location text,
  status text NOT NULL DEFAULT 'orcamento',
  closed_value numeric(12, 2),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_status_check
      CHECK (status IN ('orcamento', 'negociacao', 'fechado', 'em_producao', 'entregue', 'cancelado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_event_date ON public.projects(event_date);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and editor can view projects" ON public.projects;
CREATE POLICY "Admin and editor can view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can insert projects" ON public.projects;
CREATE POLICY "Admin and editor can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can update projects" ON public.projects;
CREATE POLICY "Admin and editor can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Only admin can delete projects" ON public.projects;
CREATE POLICY "Only admin can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------------
-- 3) ACTIVITIES — timeline do cliente + trilha de auditoria
--    Imutável por design: só INSERT e SELECT (nem admin apaga)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  summary text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_actor_type_check') THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_actor_type_check
      CHECK (actor_type IN ('user', 'agent', 'system'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_client ON public.activities(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project ON public.activities(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and editor can view activities" ON public.activities;
CREATE POLICY "Admin and editor can view activities"
  ON public.activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can insert activities" ON public.activities;
CREATE POLICY "Admin and editor can insert activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- -------------------------------------------------------------
-- 4) PROPOSALS (fisicamente: budget_links)
--    Snapshots + versionamento. Nada aqui é destrutivo.
-- -------------------------------------------------------------
ALTER TABLE public.budget_links
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.budget_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.budget_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_hash text,
  ADD COLUMN IF NOT EXISTS total_value numeric(12, 2),
  ADD COLUMN IF NOT EXISTS selection jsonb,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_document text,
  ADD COLUMN IF NOT EXISTS accepted_ip text,
  ADD COLUMN IF NOT EXISTS accepted_user_agent text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_budget_links_client ON public.budget_links(client_id);
CREATE INDEX IF NOT EXISTS idx_budget_links_project ON public.budget_links(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_links_parent ON public.budget_links(parent_id);

-- Status válidos da proposta (mantém os atuais + novos)
DO $$
BEGIN
  -- normaliza qualquer status fora da máquina de estados
  UPDATE public.budget_links
  SET status = 'created'
  WHERE status IS NULL
     OR status NOT IN ('created', 'sent', 'viewed', 'negotiating', 'accepted', 'rejected', 'expired', 'superseded', 'generic');

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_links_status_check') THEN
    ALTER TABLE public.budget_links
      ADD CONSTRAINT budget_links_status_check
      CHECK (status IN ('created', 'sent', 'viewed', 'negotiating', 'accepted', 'rejected', 'expired', 'superseded', 'generic'));
  END IF;
END $$;

-- -------------------------------------------------------------
-- 5) RPCs PÚBLICAS
--    O anon nunca mais lê budget_links direto. Só por token.
-- -------------------------------------------------------------

-- Leitura da proposta por token (ou slug, no modo genérico)
CREATE OR REPLACE FUNCTION public.proposal_get(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.budget_links;
  v_template public.budget_templates;
  v_niche public.niches;
  v_niche_json jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 6 OR length(_token) > 120 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_link FROM public.budget_links WHERE token = _token LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_template FROM public.budget_templates WHERE id = v_link.template_id;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    SELECT * INTO v_niche FROM public.niches WHERE slug = v_template.niche LIMIT 1;
    v_niche_json := CASE
      WHEN v_niche.id IS NULL THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'id', v_niche.id,
        'name', v_niche.name,
        'slug', v_niche.slug,
        'cover_image', v_niche.cover_image
      )
    END;

    RETURN jsonb_build_object(
      'mode', 'link',
      'proposal', to_jsonb(v_link) - 'accepted_ip' - 'accepted_user_agent',
      'template', to_jsonb(v_template),
      'niche', v_niche_json
    );
  END IF;

  -- Modo genérico: o token é o slug de um modelo ativo
  SELECT * INTO v_template FROM public.budget_templates WHERE slug = _token AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_niche FROM public.niches WHERE slug = v_template.niche LIMIT 1;
  v_niche_json := CASE
    WHEN v_niche.id IS NULL THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'id', v_niche.id,
      'name', v_niche.name,
      'slug', v_niche.slug,
      'cover_image', v_niche.cover_image
    )
  END;

  RETURN jsonb_build_object(
    'mode', 'generic',
    'proposal', jsonb_build_object('status', 'generic', 'client_name', ''),
    'template', to_jsonb(v_template),
    'niche', v_niche_json
  );
END;
$$;

-- Registro de visualização (única escrita permitida ao anon)
CREATE OR REPLACE FUNCTION public.proposal_track_view(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 6 OR length(_token) > 120 THEN
    RETURN;
  END IF;

  UPDATE public.budget_links
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status IN ('created', 'sent') THEN 'viewed' ELSE status END
  WHERE token = _token;
END;
$$;

REVOKE ALL ON FUNCTION public.proposal_get(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proposal_track_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proposal_get(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proposal_track_view(text) TO anon, authenticated;

-- -------------------------------------------------------------
-- 6) RLS — fechando os buracos
-- -------------------------------------------------------------

-- budget_links: anon não lê nem escreve mais direto
DROP POLICY IF EXISTS "Leitura publica por token" ON public.budget_links;
DROP POLICY IF EXISTS "Escrita para budget_links (update viewed_at) anon" ON public.budget_links;
DROP POLICY IF EXISTS "Admin total access budget_links" ON public.budget_links;

CREATE POLICY "Admin and editor manage budget_links"
  ON public.budget_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- budget_templates: só admin/editor (antes era qualquer autenticado)
DROP POLICY IF EXISTS "Admin total access budget_templates" ON public.budget_templates;

CREATE POLICY "Admin and editor manage budget_templates"
  ON public.budget_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- clients: parede pública passa a usar show_on_site (e exige logo)
DROP POLICY IF EXISTS "Public can view featured active clients" ON public.clients;

CREATE POLICY "Public can view public clients"
  ON public.clients FOR SELECT
  USING (is_active = true AND show_on_site = true AND logo_url IS NOT NULL);

-- -------------------------------------------------------------
-- 7) Comentários de documentação
-- -------------------------------------------------------------
COMMENT ON TABLE public.clients IS 'Clientes: quem contrata e paga. Fonte do histórico, projetos, propostas e contratos.';
COMMENT ON TABLE public.partners IS 'Parceiros: indicação, permuta, fornecedor, cerimonial. Não são clientes e não entram em faturamento.';
COMMENT ON TABLE public.projects IS 'Trabalho/job. Elo entre cliente, proposta, contrato e financeiro.';
COMMENT ON TABLE public.activities IS 'Timeline do cliente e trilha de auditoria. Imutável (sem UPDATE/DELETE).';
COMMENT ON TABLE public.budget_links IS 'Propostas enviadas. Nome físico legado; entidade = proposal.';
COMMENT ON COLUMN public.budget_links.content_snapshot IS 'Cópia imutável do conteúdo no momento do envio.';
COMMENT ON COLUMN public.budget_links.snapshot_hash IS 'SHA-256 do content_snapshot, para prova de aceite.';
COMMENT ON COLUMN public.budget_links.selection IS 'Pacote e adicionais escolhidos pelo cliente no aceite.';
