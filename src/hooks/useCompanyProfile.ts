import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyProfile {
  legal_name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  site: string;
}

const FALLBACK: CompanyProfile = {
  legal_name: "Blackboy Films",
  document: "41.260.784/0001-74",
  email: "blackboyfilms@hotmail.com",
  phone: "(45) 99827-2361",
  address: "Rua Marechal Deodoro, 1563",
  city: "Cascavel",
  state: "PR",
  site: "blackboyfilms.com.br",
};

export function useCompanyProfile(): CompanyProfile {
  const { data } = useQuery({
    queryKey: ["site_settings", "company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "company")
        .maybeSingle();

      if (error) throw error;
      return (data?.value ?? {}) as Partial<CompanyProfile>;
    },
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  return { ...FALLBACK, ...(data ?? {}) };
}
