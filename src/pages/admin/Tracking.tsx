import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  useTrackingConfig, 
  useUpdateTrackingConfig,
  type TrackingConfig 
} from "@/hooks/useTrackingConfig";
import { 
  BarChart3, 
  Facebook, 
  Shield, 
  Save,
  CheckCircle,
  AlertCircle,
  Tag
} from "lucide-react";

// TikTok icon component
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const predefinedEvents = [
  { name: "page_view", description: "Navegação entre páginas", platforms: ["GA4", "Meta", "TikTok"] },
  { name: "generate_lead", description: "Envio do formulário de contato", platforms: ["GA4", "Meta", "TikTok"] },
  { name: "click_whatsapp_header", description: "Clique no WhatsApp do header", platforms: ["GA4", "Meta", "TikTok"] },
  { name: "click_whatsapp_floating", description: "Clique no botão flutuante", platforms: ["GA4", "Meta", "TikTok"] },
  { name: "view_portfolio_item", description: "Visualização de projeto", platforms: ["GA4", "Meta"] },
  { name: "click_niche_card", description: "Clique em card de nicho", platforms: ["GA4", "Meta"] },
  { name: "cta_primary_click", description: "Clique no CTA principal", platforms: ["GA4", "Meta"] },
  { name: "form_start", description: "Início do preenchimento", platforms: ["GA4"] },
];

export default function Tracking() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { data: config, isLoading } = useTrackingConfig();
  const updateConfig = useUpdateTrackingConfig();
  
  const [formData, setFormData] = useState<TrackingConfig>({
    ga4: { enabled: false, measurement_id: "", debug_mode: false },
    meta: { enabled: false, pixel_id: "" },
    tiktok: { enabled: false, pixel_id: "" },
    gtm: { enabled: false, container_id: "" },
    lgpd: { anonymize_ip: true, consent_mode: true, cookies_required: false },
  });

  const isAdmin = role === "admin";

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Validation patterns for pixel IDs - prevents script injection
  const validateGA4Id = (id: string) => /^G-[A-Z0-9]{6,12}$/i.test(id.trim());
  const validateMetaId = (id: string) => /^[0-9]{15,16}$/.test(id.trim());
  const validateTikTokId = (id: string) => /^[A-Z0-9]{18,24}$/i.test(id.trim());
  const validateGTMId = (id: string) => /^GTM-[A-Z0-9]{7,12}$/i.test(id.trim());

  const handleSave = async () => {
    // Validate all enabled pixel IDs before saving
    const errors: string[] = [];
    
    if (formData.ga4.enabled && formData.ga4.measurement_id) {
      if (!validateGA4Id(formData.ga4.measurement_id)) {
        errors.push("GA4 Measurement ID inválido. Formato esperado: G-XXXXXXXXXX");
      }
    }
    
    if (formData.meta.enabled && formData.meta.pixel_id) {
      if (!validateMetaId(formData.meta.pixel_id)) {
        errors.push("Meta Pixel ID inválido. Deve ter 15-16 dígitos numéricos.");
      }
    }
    
    if (formData.tiktok.enabled && formData.tiktok.pixel_id) {
      if (!validateTikTokId(formData.tiktok.pixel_id)) {
        errors.push("TikTok Pixel ID inválido. Deve ter 18-24 caracteres alfanuméricos.");
      }
    }

    if (formData.gtm.enabled && formData.gtm.container_id) {
      if (!validateGTMId(formData.gtm.container_id)) {
        errors.push("GTM Container ID inválido. Formato esperado: GTM-XXXXXXX");
      }
    }
    
    if (errors.length > 0) {
      toast({
        title: "IDs de pixel inválidos",
        description: errors.join(" "),
        variant: "destructive",
      });
      return;
    }

    try {
      await updateConfig.mutateAsync(formData);
      toast({
        title: "Configurações salvas",
        description: "As configurações de tracking foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Configurações de Tracking</h1>
          <p className="text-muted-foreground">
            Configure os pixels de rastreamento sem mexer no código
          </p>
        </div>

        {!isAdmin && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Você tem permissão apenas para visualizar. Apenas administradores podem editar.
            </p>
          </div>
        )}

        {/* Pixel Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* GA4 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Google Analytics 4</CardTitle>
                    <CardDescription>Análise de tráfego e conversões</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={formData.ga4.enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, ga4: { ...prev.ga4, enabled: checked } }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga4-id">Measurement ID</Label>
                <div className="relative">
                  <Input
                    id="ga4-id"
                    placeholder="G-XXXXXXXXXX"
                    value={formData.ga4.measurement_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ga4: { ...prev.ga4, measurement_id: e.target.value },
                      }))
                    }
                    disabled={!isAdmin}
                    className="pr-10"
                  />
                  {formData.ga4.measurement_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validateGA4Id(formData.ga4.measurement_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ga4-debug" className="text-sm">Debug Mode</Label>
                <Switch
                  id="ga4-debug"
                  checked={formData.ga4.debug_mode}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, ga4: { ...prev.ga4, debug_mode: checked } }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Meta Pixel */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Facebook className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Meta Pixel</CardTitle>
                    <CardDescription>Facebook & Instagram Ads</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={formData.meta.enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, meta: { ...prev.meta, enabled: checked } }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-id">Pixel ID</Label>
                <div className="relative">
                  <Input
                    id="meta-id"
                    placeholder="1234567890123456"
                    value={formData.meta.pixel_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, pixel_id: e.target.value },
                      }))
                    }
                    disabled={!isAdmin}
                    className="pr-10"
                  />
                  {formData.meta.pixel_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validateMetaId(formData.meta.pixel_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TikTok Pixel */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/20">
                    <TikTokIcon />
                  </div>
                  <div>
                    <CardTitle className="text-lg">TikTok Pixel</CardTitle>
                    <CardDescription>TikTok Ads</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={formData.tiktok.enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, tiktok: { ...prev.tiktok, enabled: checked } }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tiktok-id">Pixel ID</Label>
                <div className="relative">
                  <Input
                    id="tiktok-id"
                    placeholder="XXXXXXXXXXXXXXXXXXXX"
                    value={formData.tiktok.pixel_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tiktok: { ...prev.tiktok, pixel_id: e.target.value },
                      }))
                    }
                    disabled={!isAdmin}
                    className="pr-10"
                  />
                  {formData.tiktok.pixel_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validateTikTokId(formData.tiktok.pixel_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LGPD */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">LGPD / Privacidade</CardTitle>
                  <CardDescription>Configurações de conformidade</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Anonimizar IP</Label>
                  <p className="text-xs text-muted-foreground">Não envia IP completo ao GA4</p>
                </div>
                <Switch
                  checked={formData.lgpd.anonymize_ip}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      lgpd: { ...prev.lgpd, anonymize_ip: checked },
                    }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Consent Mode V2</Label>
                  <p className="text-xs text-muted-foreground">Modo de consentimento do Google</p>
                </div>
                <Switch
                  checked={formData.lgpd.consent_mode}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      lgpd: { ...prev.lgpd, consent_mode: checked },
                    }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Cookies Obrigatórios</Label>
                  <p className="text-xs text-muted-foreground">Exige aceite antes de carregar</p>
                </div>
                <Switch
                  checked={formData.lgpd.cookies_required}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      lgpd: { ...prev.lgpd, cookies_required: checked },
                    }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Google Tag Manager */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/20">
                    <Tag className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Google Tag Manager</CardTitle>
                    <CardDescription>Gerenciamento de tags centralizado</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={formData.gtm.enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, gtm: { ...prev.gtm, enabled: checked } }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gtm-id">Container ID</Label>
                <div className="relative">
                  <Input
                    id="gtm-id"
                    placeholder="GTM-XXXXXXX"
                    value={formData.gtm.container_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gtm: { ...prev.gtm, container_id: e.target.value },
                      }))
                    }
                    disabled={!isAdmin}
                    className="pr-10"
                  />
                  {formData.gtm.container_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validateGTMId(formData.gtm.container_id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Configurados</CardTitle>
            <CardDescription>
              Lista de eventos que serão rastreados automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predefinedEvents.map((event) => (
                <div
                  key={event.name}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-mono text-sm">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {event.platforms.map((platform) => (
                      <Badge
                        key={platform}
                        variant="outline"
                        className={
                          platform === "GA4"
                            ? "border-orange-500/50 text-orange-500"
                            : platform === "Meta"
                            ? "border-blue-500/50 text-blue-500"
                            : "border-pink-500/50 text-pink-500"
                        }
                      >
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateConfig.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateConfig.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
