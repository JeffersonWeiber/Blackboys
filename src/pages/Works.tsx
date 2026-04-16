import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { VideoModal } from "@/components/ui/VideoModal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useActiveNiches } from "@/hooks/useNiches";
import { cn } from "@/lib/utils";
import { Play, Loader2, Film } from "lucide-react";
import {
  detectVideoType,
  extractVideoId,
  generateThumbnailUrl,
  isShortVideo,
  VideoType,
} from "@/lib/videoUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioItem {
  id: string;
  title: string;
  niche: string;
  niches: string[] | null;
  video_url: string;
  video_type: string;
  thumbnail_url: string | null;
}

interface SelectedVideo {
  videoUrl: string;
  videoType: VideoType;
}

function resolveVideoType(videoUrl: string, rawType?: string | null): VideoType {
  const detected = detectVideoType(videoUrl);
  if (detected === "youtube-short") return detected;

  const explicitType = rawType as VideoType | undefined;
  if (explicitType && explicitType !== "unknown") return explicitType;

  return detected;
}

function getThumbnailCandidates(project: PortfolioItem): string[] {
  const resolvedType = resolveVideoType(project.video_url, project.video_type);
  const candidates: string[] = [];

  if (project.thumbnail_url) {
    candidates.push(project.thumbnail_url);
  }

  const videoId = extractVideoId(project.video_url, resolvedType);
  if (!videoId) {
    const generated = generateThumbnailUrl(project.video_url, resolvedType);
    if (generated) candidates.push(generated);
    return [...new Set(candidates)];
  }

  if (resolvedType === "youtube" || resolvedType === "youtube-short") {
    candidates.push(
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    );
  } else if (resolvedType === "drive") {
    candidates.push(
      `https://drive.google.com/thumbnail?id=${videoId}&sz=w1280`,
      `https://drive.google.com/thumbnail?id=${videoId}&sz=w640`,
      `https://drive.google.com/thumbnail?id=${videoId}&sz=w320`
    );
  } else {
    const generated = generateThumbnailUrl(project.video_url, resolvedType);
    if (generated) candidates.push(generated);
  }

  return [...new Set(candidates)];
}

function WorksThumbnail({ project }: { project: PortfolioItem }) {
  const thumbnailCandidates = useMemo(
    () => getThumbnailCandidates(project),
    [project]
  );
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [thumbnailBroken, setThumbnailBroken] = useState(false);

  useEffect(() => {
    setThumbnailIndex(0);
    setThumbnailBroken(false);
  }, [thumbnailCandidates, project.id]);

  const currentThumbnail = thumbnailCandidates[thumbnailIndex];

  const handleThumbnailError = () => {
    if (thumbnailIndex < thumbnailCandidates.length - 1) {
      setThumbnailIndex((prev) => prev + 1);
      return;
    }

    setThumbnailBroken(true);
  };

  if (!currentThumbnail || thumbnailBroken) {
    return (
      <div className="w-full h-full bg-muted/70 flex items-center justify-center">
        <Film className="w-10 h-10 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={currentThumbnail}
      alt={project.title}
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      onError={handleThumbnailError}
      loading="lazy"
    />
  );
}

export default function Works() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [activeCategory, setActiveCategory] = useState(categoryParam || "all");
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  // Fetch active niches for dynamic categories
  const { data: niches, isLoading: isLoadingNiches } = useActiveNiches();

  // Build categories from niches
  const categories = [
    { id: "all", label: "Todos" },
    ...(niches?.map(n => ({ id: n.slug, label: n.name })) || []),
  ];

  // Fetch published portfolio items
  const { data: projects, isLoading } = useQuery({
    queryKey: ["portfolio-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("id, title, niche, niches, video_url, video_type, thumbnail_url")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  const allFilteredProjects = activeCategory === "all"
    ? projects
    : projects?.filter((p) => p.niches?.includes(activeCategory) || p.niche === activeCategory);

  const filteredProjects = allFilteredProjects?.slice(0, visibleCount) || [];

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setVisibleCount(12); // Reset to 12 when changing category
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handleProjectClick = (project: PortfolioItem) => {
    setSelectedVideo({
      videoUrl: project.video_url,
      videoType: resolveVideoType(project.video_url, project.video_type),
    });
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container mx-auto px-4 lg:px-8">
          <SectionTitle
            subtitle="Portfólio"
            title="NOSSOS TRABALHOS"
          />

          {/* Filter */}
          {isLoadingNiches ? (
            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="w-24 h-10 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    activeCategory === cat.id
                      ? "bg-gold text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Projects Grid */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhum projeto encontrado nesta categoria.</p>
            </div>
          ) : (
            <div
              ref={ref}
              className={cn(
                "space-y-5 md:space-y-6 reveal-stagger",
                // Force visible when filtering to prevent blank spaces if the ScrollReveal doesn't trigger again
                (isVisible || (!isLoading && filteredProjects && filteredProjects.length > 0)) && "visible"
              )}
            >
              {filteredProjects?.map((project, index) => {
                const projectType = resolveVideoType(project.video_url, project.video_type);
                const isShort = isShortVideo(projectType);
                
                return (
                  <button
                    type="button"
                    key={project.id}
                    className={cn(
                      "group relative w-full rounded-2xl overflow-hidden text-left border border-white/10",
                      "bg-card/70 backdrop-blur-sm cursor-pointer transition-all duration-300 video-glow",
                      "hover:border-gold/40 hover:shadow-[0_20px_50px_-30px_hsl(var(--gold)/0.5)]"
                    )}
                    // Stagger delay via CSS custom property consumed by .reveal-stagger.visible > *
                    style={{ "--reveal-delay": `${Math.min(index, 10) * 0.08}s` } as CSSProperties}
                    onClick={() => handleProjectClick(project)}
                    aria-label={`Abrir vídeo ${project.title}`}
                  >
                    <div className="relative h-60 md:h-72 lg:h-80 bg-black/60">
                      <WorksThumbnail project={project} />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 group-hover:from-black/90 group-hover:via-black/45 group-hover:to-black/15 transition-colors duration-300 pointer-events-none" />

                      <div className="absolute top-4 left-4 flex gap-2 z-10">
                        <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur text-xs font-medium text-white capitalize">
                          {project.niche}
                        </span>
                        {isShort && (
                          <span className="px-3 py-1 rounded-full bg-red-600/80 backdrop-blur text-xs font-medium text-white">
                            Shorts
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <div className="w-14 h-14 rounded-full bg-gold/20 backdrop-blur flex items-center justify-center border border-gold/50">
                          <Play className="w-6 h-6 text-gold" />
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 z-10">
                        <h3 className="text-lg md:text-2xl text-white leading-tight opacity-100 md:opacity-0 md:translate-y-3 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
                          {project.title}
                        </h3>
                        <p className="mt-2 text-sm md:text-base text-white/80 opacity-100 md:opacity-0 md:translate-y-3 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
                          Clique para assistir o case completo.
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {allFilteredProjects && allFilteredProjects.length > visibleCount && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={loadMore}
                className="px-8 py-3 rounded-full bg-transparent border border-gold text-gold hover:bg-gold hover:text-primary-foreground font-medium transition-colors duration-300"
              >
                Carregar mais
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={handleCloseModal}
        videoUrl={selectedVideo?.videoUrl || ""}
        videoType={selectedVideo?.videoType}
      />
    </Layout>
  );
}
