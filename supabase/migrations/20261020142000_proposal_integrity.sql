-- =============================================================
-- Integridade da proposta
--
-- A proposta aceita é a prova da contratação (nome, documento,
-- IP, data e hash). Ela não pode desaparecer junto com o projeto
-- nem com o modelo que a originou.
-- =============================================================

ALTER TABLE public.budget_links
  DROP CONSTRAINT IF EXISTS budget_links_project_id_fkey;

ALTER TABLE public.budget_links
  ADD CONSTRAINT budget_links_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.budget_links
  DROP CONSTRAINT IF EXISTS budget_links_template_id_fkey;

ALTER TABLE public.budget_links
  ADD CONSTRAINT budget_links_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.budget_templates(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT budget_links_project_id_fkey ON public.budget_links IS
  'Apagar o projeto não apaga a proposta: o vínculo apenas é desfeito.';
COMMENT ON CONSTRAINT budget_links_template_id_fkey ON public.budget_links IS
  'Modelo com propostas vinculadas não pode ser excluído (arquive em vez disso).';
