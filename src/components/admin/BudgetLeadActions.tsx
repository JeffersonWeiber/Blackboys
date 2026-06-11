import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Copy, Send, ExternalLink, FileText } from "lucide-react";

export function BudgetLeadActions({ lead, onStatusUpdate }: { lead: any; onStatusUpdate: (status: string) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [existingLink, setExistingLink] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (lead?.niche) {
      fetchTemplates();
      fetchExistingLink();
    }
  }, [lead]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_templates")
        .select("*")
        .eq("niche", lead.niche)
        .eq("is_active", true);

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (err) {
      console.error("Erro ao buscar templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingLink = async () => {
    try {
      const { data, error } = await supabase
        .from("budget_links")
        .select("*, template:budget_templates(*)")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExistingLink(data);
        setSelectedTemplateId(data.template_id);
      }
    } catch (err) {
      console.error("Erro ao buscar link existente:", err);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedTemplateId || !lead) return;
    setGenerating(true);

    try {
      // Check if there's already a link for this template and lead
      const { data: existing, error: existingErr } = await supabase
        .from("budget_links")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("template_id", selectedTemplateId)
        .maybeSingle();

      if (existing) {
        // Reuse existing
        await fetchExistingLink();
        toast({ title: "Link recuperado com sucesso!" });
      } else {
        // Create new
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const payload = {
          lead_id: lead.id,
          template_id: selectedTemplateId,
          token,
          client_name: lead.name.split(" ")[0], // First name
          client_phone: lead.phone_e164 || lead.phone,
          client_email: lead.email,
          status: "created"
        };

        const { data, error } = await supabase
          .from("budget_links")
          .insert([payload])
          .select("*, template:budget_templates(*)")
          .single();

        if (error) throw error;
        
        setExistingLink(data);
        
        // Update lead status
        await supabase.from("leads").update({ status: "proposta_enviada" }).eq("id", lead.id);
        onStatusUpdate("proposta_enviada");
        
        toast({ title: "Link gerado com sucesso!" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar link", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getPublicUrl = () => {
    if (!existingLink) return "";
    return `${window.location.origin}/orcamento/${existingLink.token}`;
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado para a área de transferência!" });
  };

  const handleSendWhatsApp = async () => {
    if (!existingLink) return;
    
    const template = existingLink.template;
    let msg = template.whatsapp_message || "Olá! Gostaria de falar sobre o orçamento.";
    
    // Replace variables
    msg = msg.replace(/{{client_name}}/g, existingLink.client_name || "Cliente");
    msg = msg.replace(/{{budget_url}}/g, getPublicUrl());
    msg = msg.replace(/{{template_name}}/g, template.name);

    const encodedMsg = encodeURIComponent(msg);
    const phone = lead.phone.replace(/\D/g, "");
    const finalPhone = phone.startsWith("55") ? phone : `55${phone}`;
    
    window.open(`https://wa.me/${finalPhone}?text=${encodedMsg}`, "_blank");

    // Update status to sent
    await supabase.from("budget_links").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", existingLink.id);
    await supabase.from("leads").update({ status: "proposta_enviada" }).eq("id", lead.id);
    onStatusUpdate("proposta_enviada");
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-lg">Orçamento</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 border-gold/20 bg-gradient-to-br from-background to-gold/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <FileText className="w-5 h-5" />
          Proposta e Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-2 space-y-3">
            <p>Nenhum modelo ativo para o nicho <b>{lead.niche}</b>.</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/orcamentos/new">Criar modelo de orçamento</a>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={!!existingLink}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(tpl => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!existingLink ? (
              <Button 
                onClick={handleGenerateLink} 
                className="w-full bg-gold hover:bg-gold/90 text-black font-semibold"
                disabled={generating || !selectedTemplateId}
              >
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Gerar Link Único
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-black/50 border border-slate-800 rounded-lg text-xs font-mono break-all text-muted-foreground">
                  {getPublicUrl()}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" /> Copiar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> Visualizar
                    </a>
                  </Button>
                </div>
                <Button onClick={handleSendWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                  <Send className="w-4 h-4 mr-2" /> Enviar pelo WhatsApp
                </Button>

                {/* Status indicators */}
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                  <span>Status: <b className="text-white capitalize">{existingLink.status}</b></span>
                  {existingLink.viewed_at && (
                    <span className="text-green-500 font-medium">Visto pelo cliente</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
