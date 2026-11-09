-- =============================================================
-- CONTRATOS
-- -------------------------------------------------------------
-- O aceite da proposta gera um contrato imutável (snapshot).
-- A página pública /contrato/:token lê apenas por RPC, nunca
-- acessa a tabela direto.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  proposal_id uuid REFERENCES public.budget_links(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'generated',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  CONSTRAINT contracts_status_check CHECK (status IN ('generated', 'signed', 'cancelled'))
);

-- Um contrato por proposta: reaceite não duplica documento.
CREATE UNIQUE INDEX IF NOT EXISTS contracts_proposal_unique
  ON public.contracts(proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_client ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created ON public.contracts(created_at DESC);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and editor can view contracts" ON public.contracts;
CREATE POLICY "Admin and editor can view contracts"
  ON public.contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admin and editor can update contracts" ON public.contracts;
CREATE POLICY "Admin and editor can update contracts"
  ON public.contracts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Only admin can delete contracts" ON public.contracts;
CREATE POLICY "Only admin can delete contracts"
  ON public.contracts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------------
-- Geração automática no aceite
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contract_create_for_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_number text;
  v_token text;
  v_protocol text;
  v_template_name text;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.contracts WHERE proposal_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_protocol := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  v_number := 'CT-' || to_char(coalesce(NEW.accepted_at, now()), 'YYYY') || '-' || v_protocol;
  v_token := encode(extensions.gen_random_bytes(12), 'hex');

  SELECT name INTO v_template_name FROM public.budget_templates WHERE id = NEW.template_id;

  INSERT INTO public.contracts (token, proposal_id, client_id, project_id, number, content)
  VALUES (
    v_token,
    NEW.id,
    NEW.client_id,
    NEW.project_id,
    v_number,
    jsonb_build_object(
      'number', v_number,
      'generated_at', coalesce(NEW.accepted_at, now()),
      'proposal', jsonb_build_object(
        'protocol', v_protocol,
        'accepted_at', NEW.accepted_at,
        'document', coalesce(v_template_name, 'Proposta')
      ),
      'client', jsonb_build_object(
        'name', coalesce(NEW.accepted_by_name, NEW.client_name),
        'document', NEW.accepted_document,
        'email', NEW.client_email,
        'phone', NEW.client_phone
      ),
      'service', coalesce(NEW.selection, '{}'::jsonb),
      'total', coalesce(NEW.total_value, 0),
      'event', NULL
    )
  );

  INSERT INTO public.activities (entity_type, entity_id, client_id, project_id, actor_type, action, summary)
  VALUES (
    'contract',
    NEW.id,
    NEW.client_id,
    NEW.project_id,
    'system',
    'contract.generated',
    'Contrato ' || v_number || ' gerado a partir do aceite.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_on_accept ON public.budget_links;
CREATE TRIGGER trg_contract_on_accept
  AFTER UPDATE OF status ON public.budget_links
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_create_for_accept();

-- -------------------------------------------------------------
-- Leitura pública do contrato (token é a credencial)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contract_get(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts;
  v_company jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 6 OR length(_token) > 120 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_contract FROM public.contracts WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT value INTO v_company FROM public.site_settings WHERE key = 'company';

  RETURN jsonb_build_object(
    'contract', to_jsonb(v_contract) - 'token',
    'company', coalesce(v_company, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contract_get(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contract_get(text) TO anon, authenticated;

-- -------------------------------------------------------------
-- A proposta passa a informar o contrato gerado
-- -------------------------------------------------------------
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
  v_contract jsonb;
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

    SELECT jsonb_build_object('token', c.token, 'number', c.number)
      INTO v_contract
      FROM public.contracts c
     WHERE c.proposal_id = v_link.id
     ORDER BY c.created_at DESC
     LIMIT 1;

    RETURN jsonb_build_object(
      'mode', 'link',
      'proposal', to_jsonb(v_link)
        - 'accepted_ip'
        - 'accepted_user_agent'
        - 'accepted_document'
        - 'notes',
      'contract', v_contract,
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
    'contract', NULL,
    'template', to_jsonb(v_template),
    'niche', v_niche_json
  );
END;
$$;

COMMENT ON TABLE public.contracts IS
  'Contrato gerado no aceite da proposta. O content é o snapshot imutável do que foi aceito.';
