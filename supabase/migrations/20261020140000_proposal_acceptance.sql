-- =============================================================
-- ACEITE DA PROPOSTA
-- O cliente escolhe pacote + adicionais no link público.
-- O preço é calculado SEMPRE no servidor, a partir do snapshot,
-- nunca a partir do que o navegador envia.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -------------------------------------------------------------
-- 1) Leitura pública: esconde também o documento do aceitante.
--    O cliente não precisa ver o próprio CPF na tela, e o token
--    não deve expor dado pessoal a quem o receba encaminhado.
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
      'proposal', to_jsonb(v_link)
        - 'accepted_ip'
        - 'accepted_user_agent'
        - 'accepted_document'
        - 'notes',
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

-- -------------------------------------------------------------
-- 2) Aceite
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proposal_accept(
  _token text,
  _package_id text,
  _addon_indexes integer[],
  _name text,
  _document text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _consent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.budget_links;
  v_template public.budget_templates;
  v_content jsonb;
  v_pkg jsonb;
  v_addon jsonb;
  v_addons jsonb := '[]'::jsonb;
  v_idx integer;
  v_pkg_price numeric := 0;
  v_addon_total numeric := 0;
  v_total numeric := 0;
  v_client_id uuid;
  v_project_id uuid;
  v_niche_id uuid;
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_ua text;
  v_digits text;
  v_selection jsonb;
  v_now timestamptz := now();
  v_created_project boolean := false;
BEGIN
  -- ---------- validações de entrada ----------
  IF _consent IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  IF _token IS NULL OR length(_token) < 6 OR length(_token) > 120 THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  IF _name IS NULL OR length(btrim(_name)) < 3 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  v_digits := regexp_replace(coalesce(_document, ''), '\D', '', 'g');
  IF length(v_digits) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'invalid_document';
  END IF;

  IF _email IS NOT NULL AND btrim(_email) <> '' AND btrim(_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  -- ---------- trava a linha: aceite é único ----------
  SELECT * INTO v_link FROM public.budget_links WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  -- Idempotente: se já foi aceita, devolve o aceite registrado
  IF v_link.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'status', 'accepted',
      'already_accepted', true,
      'proposal_id', v_link.id,
      'protocol', upper(substr(replace(v_link.id::text, '-', ''), 1, 8)),
      'project_id', v_link.project_id,
      'client_id', v_link.client_id,
      'accepted_at', v_link.accepted_at,
      'accepted_by_name', v_link.accepted_by_name,
      'package', coalesce(v_link.selection -> 'package', '{}'::jsonb),
      'addons', coalesce(v_link.selection -> 'addons', '[]'::jsonb),
      'total', coalesce(v_link.total_value, 0)
    );
  END IF;

  IF v_link.status IN ('superseded', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'proposal_unavailable';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < v_now THEN
    UPDATE public.budget_links SET status = 'expired' WHERE id = v_link.id;
    RAISE EXCEPTION 'proposal_expired';
  END IF;

  SELECT * INTO v_template FROM public.budget_templates WHERE id = v_link.template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  -- Snapshot é a fonte da verdade: é exatamente o que o cliente viu
  v_content := coalesce(v_link.content_snapshot, v_template.content, '{}'::jsonb);

  -- ---------- pacote ----------
  SELECT elem INTO v_pkg
  FROM jsonb_array_elements(coalesce(v_content -> 'packages', '[]'::jsonb)) elem
  WHERE elem ->> 'id' = _package_id
  LIMIT 1;

  -- Se só existir um pacote, não precisa escolher
  IF v_pkg IS NULL AND coalesce(jsonb_array_length(v_content -> 'packages'), 0) = 1 THEN
    v_pkg := v_content -> 'packages' -> 0;
  END IF;

  IF v_pkg IS NULL THEN
    RAISE EXCEPTION 'invalid_package';
  END IF;

  v_pkg_price := greatest(coalesce((v_pkg ->> 'price')::numeric, 0), 0);

  -- ---------- adicionais (índices do snapshot, sem duplicar) ----------
  IF _addon_indexes IS NOT NULL AND array_length(_addon_indexes, 1) IS NOT NULL THEN
    _addon_indexes := (SELECT array_agg(DISTINCT i) FROM unnest(_addon_indexes) AS i);

    FOREACH v_idx IN ARRAY _addon_indexes LOOP
      IF v_idx < 0 OR v_idx >= coalesce(jsonb_array_length(v_content -> 'addons'), 0) THEN
        RAISE EXCEPTION 'invalid_addon';
      END IF;

      v_addon := v_content -> 'addons' -> v_idx;
      v_addons := v_addons || jsonb_build_array(v_addon);
      v_addon_total := v_addon_total + greatest(coalesce((v_addon ->> 'price')::numeric, 0), 0);
    END LOOP;
  END IF;

  v_total := v_pkg_price + v_addon_total;

  -- ---------- cliente: usa o vinculado ou identifica/cria ----------
  v_client_id := v_link.client_id;

  IF v_client_id IS NULL AND coalesce(nullif(btrim(_email), ''), v_link.client_email) IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE email IS NOT NULL
      AND lower(email) = lower(coalesce(nullif(btrim(_email), ''), v_link.client_email))
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE regexp_replace(coalesce(document, ''), '\D', '', 'g') = v_digits
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (name, email, phone, document, status, is_active, show_on_site, notes)
    VALUES (
      btrim(_name),
      nullif(btrim(_email), ''),
      nullif(btrim(_phone), ''),
      v_digits,
      'ativo',
      true,
      false,
      'Criado automaticamente no aceite da proposta.'
    )
    RETURNING id INTO v_client_id;
  END IF;

  SELECT id INTO v_niche_id FROM public.niches WHERE slug = v_template.niche LIMIT 1;

  -- ---------- projeto: o aceite vira trabalho ----------
  v_project_id := v_link.project_id;

  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (client_id, lead_id, niche_id, title, status, closed_value)
    VALUES (
      v_client_id,
      v_link.lead_id,
      v_niche_id,
      left(v_template.name || ' — ' || btrim(_name), 200),
      'fechado',
      v_total
    )
    RETURNING id INTO v_project_id;
    v_created_project := true;
  ELSE
    UPDATE public.projects
       SET status = 'fechado',
           closed_value = v_total,
           client_id = coalesce(client_id, v_client_id),
           niche_id = coalesce(niche_id, v_niche_id)
     WHERE id = v_project_id;
  END IF;

  -- ---------- evidência do aceite ----------
  BEGIN
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN others THEN
    v_headers := '{}'::jsonb;
  END;

  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1));
  IF v_ip = '' THEN
    v_ip := coalesce(host(inet_client_addr()), '');
  END IF;
  v_ua := left(coalesce(v_headers ->> 'user-agent', ''), 500);

  v_selection := jsonb_build_object(
    'package', jsonb_build_object(
      'id', v_pkg ->> 'id',
      'name', v_pkg ->> 'name',
      'price', v_pkg_price,
      'items', coalesce(v_pkg -> 'items', '[]'::jsonb)
    ),
    'addons', v_addons,
    'package_total', v_pkg_price,
    'addons_total', v_addon_total,
    'total', v_total,
    'accepted_at', v_now
  );

  UPDATE public.budget_links
     SET status = 'accepted',
         accepted_at = v_now,
         accepted_by_name = btrim(_name),
         accepted_document = v_digits,
         accepted_ip = nullif(v_ip, ''),
         accepted_user_agent = nullif(v_ua, ''),
         selection = v_selection,
         total_value = v_total,
         client_id = coalesce(client_id, v_client_id),
         project_id = v_project_id,
         snapshot_hash = encode(
           digest(coalesce(content_snapshot, v_template.content, '{}'::jsonb)::text, 'sha256'),
           'hex'
         )
   WHERE id = v_link.id;

  -- ---------- trilha de auditoria ----------
  INSERT INTO public.activities (entity_type, entity_id, client_id, project_id, actor_type, action, summary, diff)
  VALUES (
    'proposal',
    v_link.id,
    v_client_id,
    v_project_id,
    'system',
    'proposal.accepted',
    'Proposta aceita por ' || btrim(_name) || ' — ' || (v_pkg ->> 'name') || ' (' || v_total::text || ')',
    jsonb_build_object(
      'selection', v_selection,
      'ip', nullif(v_ip, ''),
      'user_agent', nullif(v_ua, '')
    )
  );

  IF v_created_project THEN
    INSERT INTO public.activities (entity_type, entity_id, client_id, project_id, actor_type, action, summary)
    VALUES (
      'project',
      v_project_id,
      v_client_id,
      v_project_id,
      'system',
      'project.created',
      'Projeto criado a partir do aceite da proposta.'
    );
  END IF;

  IF v_link.lead_id IS NOT NULL THEN
    UPDATE public.leads SET status = 'fechado' WHERE id = v_link.lead_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'accepted',
    'already_accepted', false,
    'proposal_id', v_link.id,
    'protocol', upper(substr(replace(v_link.id::text, '-', ''), 1, 8)),
    'project_id', v_project_id,
    'client_id', v_client_id,
    'accepted_at', v_now,
    'accepted_by_name', btrim(_name),
    'package', v_selection -> 'package',
    'addons', v_addons,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.proposal_accept(text, text, integer[], text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proposal_accept(text, text, integer[], text, text, text, text, boolean) TO anon, authenticated;

COMMENT ON FUNCTION public.proposal_accept(text, text, integer[], text, text, text, text, boolean)
  IS 'Aceite público da proposta: valida token, calcula preço no servidor a partir do snapshot, registra evidências e cria o projeto.';
