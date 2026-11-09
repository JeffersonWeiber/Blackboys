import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContractRef = {
  id: string;
  number: string;
  clientId?: string | null;
  projectId?: string | null;
};

export function useSetContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contract,
      status,
    }: {
      contract: ContractRef;
      status: "signed" | "generated";
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("contracts")
        .update({
          status,
          signed_at: status === "signed" ? new Date().toISOString() : null,
        })
        .eq("id", contract.id);

      if (error) throw error;

      const { error: activityError } = await supabase.from("activities").insert({
        entity_type: "contract",
        entity_id: contract.id,
        client_id: contract.clientId ?? null,
        project_id: contract.projectId ?? null,
        actor_type: "user",
        actor_id: user?.id ?? null,
        action: status === "signed" ? "contract.signed" : "contract.reopened",
        summary:
          status === "signed"
            ? `Contrato ${contract.number} marcado como assinado.`
            : `Assinatura do contrato ${contract.number} desfeita.`,
      });

      if (activityError) {
        // O status já foi salvo; o histórico é secundário.
        console.error("Error logging contract activity:", activityError);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["client-detail"] });

      toast.success(
        variables.status === "signed"
          ? "Contrato marcado como assinado."
          : "Contrato voltou para aguardando assinatura.",
      );
    },
    onError: (error) => {
      console.error("Error updating contract status:", error);
      toast.error("Não foi possível atualizar o contrato.");
    },
  });
}
