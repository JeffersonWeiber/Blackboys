import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useUTMParams } from "@/hooks/useUTMParams";
import { cn } from "@/lib/utils";
import { Mail, MapPin, Phone, MessageCircle, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerWebhook } from "@/hooks/useWebhook";
import { WHATSAPP_NUMBER_FULL, WHATSAPP_URL } from "@/lib/contact";

const nichos = [
  { value: "casamento", label: "Casamento" },
  { value: "eventos", label: "Eventos" },
  { value: "clinicas", label: "Clínicas" },
  { value: "marcas", label: "Marcas & Ads" },
  { value: "food", label: "Food" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "outros", label: "Outros" },
];

const comoConheceu = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "outros", label: "Outros" },
];

export default function Contato() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const { toast } = useToast();
  const utmParams = useUTMParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    nicho: "",
    cidade: "",
    comoConheceu: "",
    mensagem: "",
    consentimento: false,
  });

  // Phone mask for Brazilian format
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const validateForm = () => {
    // Name validation (at least 2 words)
    const nameWords = formData.nome.trim().split(/\s+/);
    if (nameWords.length < 2) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira seu nome completo.",
        variant: "destructive",
      });
      return false;
    }

    // Phone validation
    const phoneNumbers = formData.telefone.replace(/\D/g, "");
    if (phoneNumbers.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido.",
        variant: "destructive",
      });
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return false;
    }

    // Niche validation
    if (!formData.nicho) {
      toast({
        title: "Nicho obrigatório",
        description: "Por favor, selecione um nicho.",
        variant: "destructive",
      });
      return false;
    }

    // Message validation
    if (formData.mensagem.trim().length < 10) {
      toast({
        title: "Mensagem muito curta",
        description: "Por favor, descreva melhor o que você precisa.",
        variant: "destructive",
      });
      return false;
    }

    // LGPD consent
    if (!formData.consentimento) {
      toast({
        title: "Consentimento necessário",
        description: "Por favor, aceite os termos para continuar.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    // Format phone to E.164
    const phoneE164 = "+55" + formData.telefone.replace(/\D/g, "");

    try {
      const leadData = {
        name: formData.nome,
        phone: formData.telefone,
        phone_e164: phoneE164,
        email: formData.email,
        niche: formData.nicho,
        city: formData.cidade || null,
        message: formData.mensagem,
        source: formData.comoConheceu || null,
        consent: formData.consentimento,
        source_page: window.location.pathname,
        ...utmParams,
      };

      const { data, error } = await supabase
        .from("leads")
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;
      
      // Trigger webhook for new lead
      if (data) {
        triggerWebhook("lead_created", {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          phone_e164: data.phone_e164,
          niche: data.niche,
          city: data.city,
          message: data.message,
          status: data.status,
          notes: data.notes,
          source_page: data.source_page,
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          utm_content: data.utm_content,
          utm_term: data.utm_term,
          consent: data.consent,
          created_at: data.created_at,
        });
      }
      
      setIsSubmitted(true);
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Erro ao enviar",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const whatsappUrl = WHATSAPP_URL;

  if (isSubmitted) {
    return (
      <Layout>
        <section className="pt-32 pb-24 md:pt-40 md:pb-32 min-h-[80vh] flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gold/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-gold" />
              </div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-6">
                MENSAGEM <span className="text-gradient">ENVIADA!</span>
              </h1>
              <p className="text-muted-foreground text-lg mb-10">
                Recebemos sua mensagem e entraremos em contato em até 24 horas úteis. 
                Se preferir, fale conosco agora mesmo pelo WhatsApp.
              </p>
              <Button
                asChild
                size="lg"
                className="btn-glow bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold px-8 py-6 group"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp Agora
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container mx-auto px-4 lg:px-8">
          <SectionTitle
            subtitle="Contato"
            title="VAMOS CONVERSAR"
          />
          <p className="text-center text-muted-foreground max-w-2xl mx-auto">
            Preencha o formulário abaixo e receba uma proposta personalizada 
            para o seu projeto. Respondemos em até 24 horas úteis.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div
            ref={ref}
            className={cn("grid lg:grid-cols-3 gap-12 lg:gap-16 reveal", isVisible && "visible")}
          >
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h3 className="font-display text-2xl tracking-wide mb-8">
                INFORMAÇÕES
              </h3>
              
              <div className="space-y-6">
                <a
                  href="mailto:contato@blackboyfilms.com"
                  className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-gold/50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Mail className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">contato@blackboyfilms.com</p>
                  </div>
                </a>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-gold/50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                    <Phone className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <p className="font-medium">{WHATSAPP_NUMBER_FULL}</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-medium">Cascavel, PR - Brasil</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-6 rounded-lg bg-gold/10 border border-gold/30">
                <h4 className="font-display text-lg tracking-wide mb-2">
                  Resposta Rápida
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Para uma resposta imediata, fale conosco pelo WhatsApp.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gold text-gold hover:bg-gold hover:text-primary-foreground"
                >
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Abrir WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Seu nome completo"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="bg-card border-border/50 focus:border-gold"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone (WhatsApp) *</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      required
                      className="bg-card border-border/50 focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-card border-border/50 focus:border-gold"
                    />
                  </div>

                  {/* Nicho */}
                  <div className="space-y-2">
                    <Label>Tipo de Projeto *</Label>
                    <Select
                      value={formData.nicho}
                      onValueChange={(value) => setFormData({ ...formData, nicho: value })}
                    >
                      <SelectTrigger className="bg-card border-border/50 focus:border-gold">
                        <SelectValue placeholder="Selecione o nicho" />
                      </SelectTrigger>
                      <SelectContent>
                        {nichos.map((nicho) => (
                          <SelectItem key={nicho.value} value={nicho.value}>
                            {nicho.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Cidade */}
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade/Estado</Label>
                    <Input
                      id="cidade"
                      placeholder="São Paulo - SP"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="bg-card border-border/50 focus:border-gold"
                    />
                  </div>

                  {/* Como conheceu */}
                  <div className="space-y-2">
                    <Label>Como nos conheceu?</Label>
                    <Select
                      value={formData.comoConheceu}
                      onValueChange={(value) => setFormData({ ...formData, comoConheceu: value })}
                    >
                      <SelectTrigger className="bg-card border-border/50 focus:border-gold">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {comoConheceu.map((opcao) => (
                          <SelectItem key={opcao.value} value={opcao.value}>
                            {opcao.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mensagem */}
                <div className="space-y-2">
                  <Label htmlFor="mensagem">Conte o que você precisa *</Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Descreva seu projeto, data desejada, referências visuais ou qualquer informação relevante..."
                    value={formData.mensagem}
                    onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                    required
                    rows={5}
                    className="bg-card border-border/50 focus:border-gold resize-none"
                  />
                </div>

                {/* LGPD Consent */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consentimento"
                    checked={formData.consentimento}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, consentimento: checked as boolean })
                    }
                    className="mt-1 border-border/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <Label htmlFor="consentimento" className="text-sm text-muted-foreground leading-relaxed">
                    Concordo com a{" "}
                    <a href="/privacidade" className="text-gold hover:underline">
                      Política de Privacidade
                    </a>{" "}
                    e autorizo o uso dos meus dados para receber uma proposta comercial.
                  </Label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full btn-glow bg-gold hover:bg-gold-light text-primary-foreground font-semibold py-6 text-base"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="loader-cinema w-5 h-5" />
                      Enviando...
                    </span>
                  ) : (
                    "Receber Proposta"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
