import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
        let isGeneric = false;

        // Try searching for a specific link token first
        let { data: link, error: linkErr } = await supabase
          .from("budget_links")
          .select("*, template:budget_templates(*)")
          .eq("token", token)
          .maybeSingle();

        // If not found, check if token is actually a template slug (generic mode)
        if (!link) {
          const { data: genericTemplate } = await supabase
            .from("budget_templates")
            .select("*")
            .eq("slug", token)
            .eq("is_active", true)
            .maybeSingle();
            
          if (genericTemplate) {
            isGeneric = true;
            link = {
              template: genericTemplate,
              client_name: "",
              status: "generic",
            };
          } else {
            setError("not_found");
            return;
          }
        }

        if (!isGeneric && (link.status === "expired" || (link.expires_at && new Date(link.expires_at) < new Date()))) {
          setError("expired");
          return;
        }

        // Fetch niche info for background image
        const { data: nicheData } = await supabase
          .from("niches")
          .select("*")
          .eq("slug", link.template.niche)
          .maybeSingle();

        setLinkData({ ...link, nicheInfo: nicheData });

        // Update viewed_at if it's a specific link
        if (!isGeneric && !link.viewed_at) {
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
  const nicheInfo = linkData.nicheInfo;
  
  const heroImage = content?.cover_image || nicheInfo?.cover_image || "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1920&q=80";
  const portfolioUrl = template.portfolio_url || `/nicho/${template.niche}`;

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
      {/* HEADER / HERO ESTILO NICHO */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-[#0A0A0A]" />
        </div>

        {/* Top Navbar Area for Logo */}
        <div className="absolute top-0 left-0 w-full p-6 sm:p-12 flex justify-center z-20">
          <img src={logoBlackboy} alt="Blackboy Films" className="h-10 sm:h-12" />
        </div>

        <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center pt-24">
          {template.hero_badge && (
            <span className="inline-block text-gold text-sm font-medium tracking-[0.3em] uppercase mb-6 bg-gold/10 px-4 py-2 rounded-full border border-gold/20 backdrop-blur-sm">
              {template.hero_badge}
            </span>
          )}

          {linkData.client_name && (
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Olá, <span className="text-white font-medium">{linkData.client_name}</span>. O seu orçamento está aqui.
            </p>
          )}

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-wide mb-6 text-white uppercase drop-shadow-lg">
            {template.title}
          </h1>
          
          {template.subtitle && (
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-gold font-light drop-shadow-md">
              {template.subtitle}
            </p>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 sm:px-12 space-y-24 mt-12">
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
            <h2 className="text-2xl font-display font-bold text-white mb-4 uppercase tracking-wider">{section.title}</h2>
            {section.body && <p className="text-lg leading-relaxed text-slate-300">{section.body}</p>}
          </section>
        ))}

        {/* FORMATS */}
        {content?.formats && content.formats.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold text-center text-white mb-10 uppercase tracking-wider">
              Formatos de Entrega
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.formats.map((format: any, idx: number) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center hover:border-gold/30 transition-colors">
                  <h3 className="text-lg font-medium text-gold mb-2 uppercase tracking-wide">{format.name}</h3>
                  {format.description && <p className="text-sm text-slate-400">{format.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PACKAGES */}
        {content?.packages && content.packages.length > 0 && (
          <section>
            <h2 className="text-3xl font-display font-bold text-center text-white mb-16 uppercase tracking-wider">
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
                    <h3 className="text-2xl font-display font-bold text-white mb-2 uppercase">{pkg.name}</h3>
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
            <h2 className="text-2xl font-display font-bold text-center text-white mb-8 uppercase tracking-wider">
              Opcionais (Adicionais)
            </h2>
            <div className="space-y-3">
              {content.addons.map((addon: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-gold/20 transition-colors">
                  <span className="font-medium text-slate-200">{addon.name}</span>
                  <span className="text-gold font-bold">{formatPrice(addon.price)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACTIONS */}
        <section className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12 border-t border-slate-800">
          <Button 
            size="lg" 
            className="w-full sm:w-auto min-w-[280px] bg-gold text-black hover:bg-gold-light font-bold h-14 text-lg btn-glow"
            onClick={handleWhatsAppClick}
          >
            Quero falar sobre este orçamento
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto min-w-[280px] border-gold text-gold hover:bg-gold hover:text-black font-semibold h-14 text-lg transition-all"
            asChild
          >
            {portfolioUrl.startsWith("/") ? (
              <Link to={portfolioUrl} target="_blank" rel="noopener noreferrer">
                Explorar Portfólio <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            ) : (
              <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                Explorar Portfólio <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            )}
          </Button>
        </section>
      </main>
    </div>
  );
}
