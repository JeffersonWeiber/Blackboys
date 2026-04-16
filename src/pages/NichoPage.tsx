import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { NicheVideoPlayer } from "@/components/ui/NicheVideoPlayer";
import { VideoModal } from "@/components/ui/VideoModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useNicheBySlug } from "@/hooks/useNiches";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateThumbnailUrl, detectVideoType, isShortVideo, VideoType } from "@/lib/videoUtils";
import { ArrowRight, Play, CheckCircle, Loader2 } from "lucide-react";

// Default benefits per niche
const defaultBenefits: Record<string, string[]> = {
  casamento: [
    "Cobertura completa do evento",
    "Filme principal de 5-15 minutos",
    "Teaser para redes sociais",
    "Same-day edit disponível",
    "Drone para cenas aéreas",
    "Entrega em até 60 dias",
  ],
  eventos: [
    "Múltiplas câmeras",
    "Cobertura completa do evento",
    "Highlight reel",
    "Entrevistas com participantes",
    "Live streaming disponível",
    "Entrega expressa",
  ],
  clinicas: [
    "Vídeos institucionais",
    "Depoimentos de pacientes",
    "Apresentação de procedimentos",
    "Conteúdo para redes sociais",
    "Tours virtuais",
    "Conformidade com regulamentações",
  ],
  "marcas-e-ads": [
    "Brand films de alto impacto",
    "Campanhas publicitárias criativas",
    "Conteúdo para redes sociais",
    "Vídeos de produto e lançamento",
    "Direção de arte e storytelling",
    "Versões otimizadas para cada plataforma",
  ],
  food: [
    "Captação com técnica food styling",
    "Vídeos de receitas e preparo",
    "Conteúdo para cardápio digital",
    "Motion graphics para ofertas",
    "Ambientação e iluminação premium",
    "Versões para delivery e redes",
  ],
  imobiliario: [
    "Tour virtual cinematográfico",
    "Captação com drone e estabilizador",
    "Vídeos que valorizam cada ambiente",
    "Edição com música e motion graphics",
    "Entrega em formatos para portais",
    "Produção rápida e ágil",
  ],
  "15-anos": [
    "Cobertura completa da festa",
    "Filme emocional de 5-10 minutos",
    "Highlights para redes sociais",
    "Making of e bastidores",
    "Entrevistas com família e amigos",
    "Drone para cenas aéreas",
  ],
  aniversarios: [
    "Cobertura completa do evento",
    "Highlight reel dinâmico",
    "Vídeos para compartilhar",
    "Captação de momentos especiais",
    "Entrevistas com convidados",
    "Entrega rápida",
  ],
  empresarial: [
    "Vídeo institucional profissional",
    "Apresentação da empresa e equipe",
    "Depoimentos de colaboradores",
    "Captação no ambiente da empresa",
    "Roteiro e storytelling corporativo",
    "Versões para site e LinkedIn",
  ],
  "redes-sociais": [
    "Conteúdo recorrente planejado",
    "Reels, Stories e TikToks",
    "Calendário de produção",
    "Edição otimizada para engajamento",
    "Legendas e motion graphics",
    "Consistência visual da marca",
  ],
  marketing: [
    "Conteúdo para campanhas pagas",
    "Vídeos de conversão e awareness",
    "A/B testing com múltiplas versões",
    "Métricas e otimização",
    "Criativos para Meta e Google",
    "Entrega por lotes estratégicos",
  ],
  automotivo: [
    "Captação dinâmica de veículos",
    "Vídeos de test drive e review",
    "Cobertura de eventos automotivos",
    "Drone e câmeras de ação",
    "Edição com sonorização impactante",
    "Conteúdo para concessionárias",
  ],
  estetica: [
    "Vídeos de procedimentos",
    "Before & after premium",
    "Depoimentos de clientes",
    "Conteúdo para Instagram e TikTok",
    "Ambientação e iluminação de clínica",
    "Versões para anúncios pagos",
  ],
  "formato-vertical": [
    "Reels, TikToks e Shorts",
    "Captação nativa 9:16",
    "Edição com trends e transições",
    "Legendas animadas",
    "Músicas e efeitos em alta",
    "Pacotes recorrentes disponíveis",
  ],
  "producao-de-cursos": [
    "Captação multi-câmera em estúdio",
    "Iluminação profissional",
    "Áudio cristalino",
    "Edição didática com grafismos",
    "Suporte para plataformas EAD",
    "Entregas modulares",
  ],
  "clip-musical": [
    "Direção criativa e conceito",
    "Locações e produção de set",
    "Múltiplas câmeras e movimentos",
    "Edição ritmada à música",
    "Color grading cinematográfico",
    "Versões para plataformas",
  ],
  default: [
    "Produção profissional completa",
    "Edição cinematográfica",
    "Colorização premium",
    "Entrega em alta qualidade",
    "Versões para redes sociais",
    "Atendimento personalizado",
  ],
};

export default function NichoPage() {
  const { nicho: slug } = useParams<{ nicho: string }>();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [forceVisible, setForceVisible] = useState(false);
  
  // Fetch niche data from database
  const { data: nicheData, isLoading: isNicheLoading, error: nicheError } = useNicheBySlug(slug);

  // Force visibility after data loads (fallback for SPA navigation)
  useEffect(() => {
    if (nicheData) {
      const timer = setTimeout(() => {
        setForceVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nicheData]);

  // Fetch the most recent video for the featured section
  const { data: featuredVideo, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ["nicho-featured-video", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .contains("niches", [slug!])
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch recent projects for the grid section
  const { data: recentProjects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["nicho-recent-projects", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .contains("niches", [slug!])
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });

  // Loading state
  if (isNicheLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </Layout>
    );
  }

  // Not found state
  if (!nicheData || nicheError) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-4xl mb-4">Página não encontrada</h1>
            <p className="text-muted-foreground mb-6">
              A categoria que você está procurando não existe ou foi desativada.
            </p>
            <Button asChild>
              <Link to="/">Voltar para Home</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const benefits = defaultBenefits[slug || ""] || defaultBenefits.default;
  const heroImage = nicheData.cover_image || "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1920&q=80";
  const featuredVideoType = featuredVideo
    ? (() => {
        const detected = detectVideoType(featuredVideo.video_url);
        if (detected === "youtube-short") return detected;

        const explicitType = featuredVideo.video_type as VideoType;
        return explicitType && explicitType !== "unknown" ? explicitType : detected;
      })()
    : "unknown";
  const isFeaturedShort = isShortVideo(featuredVideoType as VideoType);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt={nicheData.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center pt-20">
          <span className="inline-block text-gold text-sm font-medium tracking-[0.3em] uppercase mb-4">
            {nicheData.name}
          </span>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wide mb-6">
            {nicheData.name.toUpperCase()}
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-foreground/80">
            {nicheData.description}
          </p>
        </div>
      </section>

      {/* Benefits + Featured Video */}
      <section className="py-24 md:py-32 bg-card">
        <div className="container mx-auto px-4 lg:px-8">
          <div
            ref={ref}
            className={cn(
              "grid lg:grid-cols-2 gap-12 lg:gap-20 items-center reveal", 
              (isVisible || forceVisible) && "visible"
            )}
          >
            <div>
              <SectionTitle
                subtitle="O Que Oferecemos"
                title="INCLUÍDO NO SERVIÇO"
                align="left"
              />
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-gold" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className="mt-10 btn-glow bg-gold hover:bg-gold-light text-primary-foreground font-semibold px-8 py-6 group"
              >
                <Link to="/contato">
                  Solicitar Orçamento
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Featured Video - auto layout: Shorts become vertical 9:16 */}
            <div
              className={cn(
                "rounded-lg overflow-hidden video-glow mx-auto",
                isFeaturedShort
                  ? "aspect-[9/16] h-[460px] sm:h-[520px] md:h-[600px] lg:h-[660px]"
                  : "w-full aspect-video"
              )}
            >
              {isFeaturedLoading ? (
                <Skeleton className="w-full h-full" />
              ) : featuredVideo ? (
                <NicheVideoPlayer
                  videoUrl={featuredVideo.video_url}
                  videoType={featuredVideo.video_type}
                  fallbackImage={featuredVideo.thumbnail_url || undefined}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Nenhum vídeo disponível</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <SectionTitle
            subtitle="Portfólio"
            title="PROJETOS RECENTES"
          />

          {isProjectsLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : recentProjects && recentProjects.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {recentProjects.map((project) => {
                const thumbnailUrl = project.thumbnail_url || 
                  generateThumbnailUrl(project.video_url, detectVideoType(project.video_url)) ||
                  heroImage;

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedVideo(project.video_url)}
                    className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer video-glow"
                  >
                    <img
                      src={thumbnailUrl}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">{project.title}</h3>
                        <div className="w-10 h-10 rounded-full bg-gold/20 backdrop-blur flex items-center justify-center border border-gold/50">
                          <Play className="w-5 h-5 text-gold" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum projeto disponível neste nicho ainda.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-gold text-gold hover:bg-gold hover:text-primary-foreground px-8"
            >
              <Link to={`/works?category=${slug}`}>Ver Todos os Projetos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-card">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-6">
            PRONTO PARA <span className="text-gradient">COMEÇAR?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10">
            Entre em contato e receba uma proposta personalizada para o seu projeto.
          </p>
          <Button
            asChild
            size="lg"
            className="btn-glow bg-gold hover:bg-gold-light text-primary-foreground font-semibold px-10 py-6"
          >
            <Link to="/contato">Receber Proposta</Link>
          </Button>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo || ""}
      />
    </Layout>
  );
}
