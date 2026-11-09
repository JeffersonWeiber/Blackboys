import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ClientStatus = "ativo" | "inativo" | "legado";

export interface Client {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: ClientStatus;
  show_on_site: boolean;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  niche_id: string | null;
  origin_lead_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInsert = Partial<
  Omit<Client, "id" | "created_at" | "updated_at" | "converted_at">
> & {
  name: string;
};
export type ClientUpdate = Partial<ClientInsert>;

// Parede de logos da Home: quem tem logo e está marcado para aparecer
export function usePublicClients() {
  return useQuery({
    queryKey: ["clients", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_site", true)
        .not("logo_url", "is", null)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
  });
}

// Hook para buscar todos os clientes (admin)
export function useAllClients() {
  return useQuery({
    queryKey: ["clients", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
  });
}

// Hook para buscar um cliente específico
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

// Hook para criar cliente
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast.error("Erro ao criar cliente");
    },
  });
}

// Hook para atualizar cliente
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast.error("Erro ao atualizar cliente");
    },
  });
}

// Hook para deletar cliente
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast.error("Erro ao excluir cliente");
    },
  });
}

// Hook para upload de logo
export function useUploadClientLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("client-logos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
    onError: (error) => {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload da logo");
    },
  });
}

// Hook para deletar logo do storage
export function useDeleteClientLogo() {
  return useMutation({
    mutationFn: async (logoUrl: string) => {
      // Extract path from URL
      const url = new URL(logoUrl);
      const pathMatch = url.pathname.match(/\/client-logos\/(.+)$/);
      if (!pathMatch) throw new Error("Invalid logo URL");

      const filePath = pathMatch[1];
      const { error } = await supabase.storage
        .from("client-logos")
        .remove([filePath]);

      if (error) throw error;
    },
    onError: (error) => {
      console.error("Error deleting logo:", error);
    },
  });
}
