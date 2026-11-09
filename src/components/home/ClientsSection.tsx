import { usePublicClients } from "@/hooks/useClients";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

export function ClientsSection() {
  const { data: clients, isLoading } = usePublicClients();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  // Don't render if no clients
  if (!isLoading && (!clients || clients.length === 0)) {
    return null;
  }

  // Duplicate clients for seamless loop
  const duplicatedClients = clients ? [...clients, ...clients] : [];

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Gold accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
      
      <div 
        ref={ref}
        className={cn("container mx-auto px-4", isVisible ? "reveal visible" : "reveal")}
      >
        {/* Section Title */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider text-foreground">
            ALGUNS DE NOSSOS CLIENTES
          </h2>
          <div className="section-divider mt-4" />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-20">
            <div className="loader-cinema" />
          </div>
        )}

        {/* Marquee Container */}
        {!isLoading && clients && clients.length > 0 && (
          <div className="relative">
            {/* Gradient overlays for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            {/* Marquee Track */}
            <div className="overflow-hidden">
              <div 
                className={cn(
                  "marquee-track flex items-center gap-12 md:gap-16 lg:gap-20",
                  "py-4"
                )}
                style={{ 
                  "--marquee-items": clients.length,
                } as React.CSSProperties}
              >
                {duplicatedClients.map((client, index) =>
                  client.logo_url ? (
                    <ClientLogo
                      key={`${client.id}-${index}`}
                      name={client.name}
                      logoUrl={client.logo_url}
                      websiteUrl={client.website_url}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface ClientLogoProps {
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
}

function ClientLogo({ name, logoUrl, websiteUrl }: ClientLogoProps) {
  const content = (
    <img
      src={logoUrl}
      alt={name}
      loading="lazy"
      className={cn(
        "h-10 md:h-12 w-auto max-w-[120px] md:max-w-[160px]",
        "object-contain opacity-70 grayscale",
        "transition-all duration-300",
        "hover:opacity-100 hover:grayscale-0 hover:scale-110",
        "flex-shrink-0"
      )}
    />
  );

  if (websiteUrl) {
    return (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
        title={name}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex-shrink-0" title={name}>
      {content}
    </div>
  );
}
