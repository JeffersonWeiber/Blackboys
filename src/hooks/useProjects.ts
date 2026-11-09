import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProjectStatus =
  | "orcamento"
  | "negociacao"
  | "fechado"
  | "em_producao"
  | "entregue"
  | "cancelado";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  orcamento: "Orçamento",
  negociacao: "Negociação",
  fechado: "Fechado",
  em_producao: "Em produção",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export type ProjectInput = {
  id: string;
  clientId?: string | null;
  title: string;
  event_date: string | null;
  location: string | null;
  status: ProjectStatus;
  closed_value: number | null;
};

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: ProjectInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("projects")
        .update({
          title: project.title.trim(),
          event_date: project.event_date || null,
          location: project.location?.trim() || null,
          status: project.status,
          closed_value: project.closed_value ?? null,
        })
        .eq("id", project.id);

      if (error) throw error;

      const { error: activityError } = await supabase.from("activities").insert({
        entity_type: "project",
        entity_id: project.id,
        client_id: project.clientId ?? null,
        project_id: project.id,
        actor_type: "user",
        actor_id: user?.id ?? null,
        action: "project.updated",
        summary: `Projeto “${project.title.trim()}” atualizado.`,
      });

      if (activityError) {
        console.error("Error logging project activity:", activityError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-detail"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Projeto atualizado.");
    },
    onError: (error) => {
      console.error("Error updating project:", error);
      toast.error("Não foi possível atualizar o projeto.");
    },
  });
}
