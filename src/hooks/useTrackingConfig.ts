import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface GA4Config {
  enabled: boolean;
  measurement_id: string;
  debug_mode: boolean;
}

export interface MetaConfig {
  enabled: boolean;
  pixel_id: string;
}

export interface TikTokConfig {
  enabled: boolean;
  pixel_id: string;
}

export interface GTMConfig {
  enabled: boolean;
  container_id: string;
}

export interface LGPDConfig {
  anonymize_ip: boolean;
  consent_mode: boolean;
  cookies_required: boolean;
}

export interface TrackingConfig {
  ga4: GA4Config;
  meta: MetaConfig;
  tiktok: TikTokConfig;
  gtm: GTMConfig;
  lgpd: LGPDConfig;
}

const defaultConfig: TrackingConfig = {
  ga4: { enabled: false, measurement_id: "", debug_mode: false },
  meta: { enabled: false, pixel_id: "" },
  tiktok: { enabled: false, pixel_id: "" },
  gtm: { enabled: false, container_id: "" },
  lgpd: { anonymize_ip: true, consent_mode: true, cookies_required: false },
};

export function useTrackingConfig() {
  return useQuery({
    queryKey: ["tracking-config"],
    queryFn: async (): Promise<TrackingConfig> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["tracking_ga4", "tracking_meta", "tracking_tiktok", "tracking_gtm", "tracking_lgpd"]);

      if (error) {
        console.error("Error fetching tracking config:", error);
        return defaultConfig;
      }

      const config: TrackingConfig = { ...defaultConfig };

      data?.forEach((row) => {
        const value = row.value as Record<string, unknown>;
        switch (row.key) {
          case "tracking_ga4":
            config.ga4 = value as unknown as GA4Config;
            break;
          case "tracking_meta":
            config.meta = value as unknown as MetaConfig;
            break;
          case "tracking_tiktok":
            config.tiktok = value as unknown as TikTokConfig;
            break;
          case "tracking_gtm":
            config.gtm = value as unknown as GTMConfig;
            break;
          case "tracking_lgpd":
            config.lgpd = value as unknown as LGPDConfig;
            break;
        }
      });

      return config;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateTrackingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: TrackingConfig) => {
      const updates = [
        { key: "tracking_ga4", value: JSON.parse(JSON.stringify(config.ga4)) as Json },
        { key: "tracking_meta", value: JSON.parse(JSON.stringify(config.meta)) as Json },
        { key: "tracking_tiktok", value: JSON.parse(JSON.stringify(config.tiktok)) as Json },
        { key: "tracking_gtm", value: JSON.parse(JSON.stringify(config.gtm)) as Json },
        { key: "tracking_lgpd", value: JSON.parse(JSON.stringify(config.lgpd)) as Json },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq("key", update.key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-config"] });
    },
  });
}
