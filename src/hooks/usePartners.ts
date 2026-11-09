import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PartnershipType =
  | "indicacao"
  | "permuta"
  | "fornecedor"
  | "cerimonial"
  | "outro";

export type PartnerStatus = "ativo" | "inativo";

export interface Partner {
  id: string;
  name: string;
  trade_name: string | null;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  partnership_type: PartnershipType;
  commission_notes: string | null;
  notes: string | null;
  status: PartnerStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PartnerInsert = Partial<
  Omit<Partner, "id" | "created_at" | "updated_at">
> & {
  name: string;
};
export type PartnerUpdate = Partial<PartnerInsert>;

export const PARTNERSHIP_LABELS: Record<PartnershipType, string> = {
  indicacao: "Indicação",
  permuta: "Permuta",
  fornecedor: "Fornecedor",
  cerimonial: "Cerimonial",
  outro: "Outro",
};

export function useAllPartners() {
  return useQuery({
    queryKey: ["partners", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Partner[];
    },
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: ["partners", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Partner;
    },
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partner: PartnerInsert) => {
      const { data, error } = await supabase
        .from("partners")
        .insert(partner)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating partner:", error);
      toast.error("Erro ao criar parceiro");
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PartnerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("partners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating partner:", error);
      toast.error("Erro ao atualizar parceiro");
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting partner:", error);
      toast.error("Erro ao excluir parceiro");
    },
  });
}
