import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ArrowRight } from "lucide-react";
import logoBlackboy from "@/assets/logo-blackboy-films.svg";
import { cn } from "@/lib/utils";

export default function BudgetPublic() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "expired" | null>(null);
  const [linkData, setLinkData] = useState<any>(null);

  useEffect(() => {
    async function fetchBudget() {
      if (!token) {
        setError("not_found");
        setLoading(false);
        return;
      }

      try {
        const { data: link, error: linkErr } = await supabase
          .from("budget_links")
          .select("*, template:budget_templates(*)")
          .eq("token", token)
          .maybeSingle();

        if (linkErr || !link) {
          setError("not_found");
          return;
        }

        if (link.status === "expired" || (link.expires_at && new Date(link.expires_at) < new Date())) {
          setError("expired");
          return;
        }

        setLinkData(link);

        // Update viewed_at if it's not set
        if (!link.viewed_at) {
          await supabase
            .from("budget_links")
            .update({
              viewed_at: new Date().toISOString(),
              status: link.status === "created" || link.status === "sent" ? "viewed" : link.status
            })
            .eq("id", link.id);
        }

      } catch (err) {
        console.error("Error fetching budget:", err);
        setError("not_found");
      } finally {
        setLoading(false);
      }
    }

    fetchBudget();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <img src={logoBlackboy} alt="Blackboy Films" className="h-12 mb-8 opacity-50" />
        <h1 className="text-2xl font-display font-bold text-center">Orçamento não encontrado</h1>
        <p className="text-muted-foreground mt-2 text-center">O link que você tentou acessar não existe ou foi removido.</p>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <img src={logoBlackboy} alt="Blackboy Films" className="h-12 mb-8 opacity-50" />
        <h1 className="text-2xl font-display font-bold text-center">Este orçamento expirou</h1>
        <p className="text-muted-foreground mt-2 text-center">Entre em contato conosco para solicitar uma nova proposta.</p>
      </div>
    );
  }

  const template = linkData.template;
  const content = template.content;
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleWhatsAppClick = () => {
    let msg = template.whatsapp_message || "Olá! Gostaria de falar sobre o orçamento.";
    
    // Replace variables
    msg = msg.replace(/{{client_name}}/g, linkData.client_name || "Cliente");
    msg = msg.replace(/{{budget_url}}/g, window.location.href);
    msg = msg.replace(/{{template_name}}/g, template.name);

    // Encode
    const encodedMsg = encodeURIComponent(msg);
    const phone = "554599827236";
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 selection:bg-gold/30 font-sans pb-24">
      {/* HEADER / HERO */}
      <header className="relative w-full pt-16 pb-20 px-6 sm:px-12 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        <img src={logoBlackboy} alt="Blackboy Films" className="h-10 sm:h-12 mb-12 relative z-10" />
        
        {template.hero_badge && (
          <div className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-medium text-gold mb-6 relative z-10">
            {template.hero_badge}
          </div>
        )}

        {linkData.client_name && (
          <p className="text-muted-foreground mb-4 relative z-10 max-w-2xl">
            Olá, <span className="text-white font-medium">{linkData.client_name}</span>. Preparamos uma proposta especial para você.
          </p>
        )}

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-6 relative z-10 max-w-4xl leading-tight">
          {template.title}
        </h1>
        
        {template.subtitle && (
          <p className="text-xl sm:text-2xl text-gold font-light relative z-10 max-w-3xl">
            {template.subtitle}
          </p>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-12 space-y-24">
        {/* INTRO TEXT */}
        {template.intro_text && (
          <section className="text-center max-w-3xl mx-auto">
            <p className="text-lg leading-relaxed text-slate-300">
              {template.intro_text}
            </p>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {content?.sections?.map((section: any, idx: number) => (
          <section key={idx} className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-display font-bold text-white mb-4">{section.title}</h2>
            {section.body && <p className="text-lg leading-relaxed text-slate-300">{section.body}</p>}
          </section>
        ))}

        {/* FORMATS */}
        {content?.formats && content.formats.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold text-center text-white mb-10">
              Formatos de Entrega
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.formats.map((format: any, idx: number) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-medium text-gold mb-2">{format.name}</h3>
                  {format.description && <p className="text-sm text-slate-400">{format.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PACKAGES */}
        {content?.packages && content.packages.length > 0 && (
          <section>
            <h2 className="text-3xl font-display font-bold text-center text-white mb-16">
              Escolha sua Experiência
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {content.packages.map((pkg: any, idx: number) => (
                <div 
                  key={idx} 
                  className={cn(
                    "rounded-2xl border p-8 flex flex-col h-full relative transition-transform hover:-translate-y-1 duration-300",
                    pkg.featured 
                      ? "bg-gradient-to-b from-slate-900 to-black border-gold shadow-[0_0_40px_-10px_rgba(212,175,55,0.3)] transform lg:-translate-y-4" 
                      : "bg-black border-slate-800"
                  )}
                >
                  {pkg.featured && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                      Recomendado
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-display font-bold text-white mb-2">{pkg.name}</h3>
                    {pkg.tagline && <p className="text-sm text-slate-400 mb-6">{pkg.tagline}</p>}
                    <div className="text-3xl font-bold text-gold">
                      {formatPrice(pkg.price)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {pkg.items?.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                        <span className="text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ADDONS */}
        {content?.addons && content.addons.length > 0 && (
          <section className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-center text-white mb-8">
              Opcionais (Adicionais)
            </h2>
            <div className="space-y-3">
              {content.addons.map((addon: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-900/30 border border-slate-800">
                  <span className="font-medium text-slate-200">{addon.name}</span>
                  <span className="text-gold font-bold">{formatPrice(addon.price)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACTIONS */}
        <section className="flex flex-col items-center justify-center gap-4 pt-12 border-t border-slate-800">
          <Button 
            size="lg" 
            className="w-full max-w-sm bg-gold text-black hover:bg-gold/90 font-bold h-14 text-lg"
            onClick={handleWhatsAppClick}
          >
            Quero falar sobre este orçamento
          </Button>
          
          {template.portfolio_url && (
            <Button 
              variant="outline" 
              size="lg"
              className="w-full max-w-sm border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              asChild
            >
              <a href={template.portfolio_url} target="_blank" rel="noopener noreferrer">
                Ver Portfólio <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
        </section>
      </main>
    </div>
  );
}
