import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

export function LocationSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-background">
      <div 
        ref={ref}
        className={cn("container mx-auto px-4", isVisible ? "reveal visible" : "reveal")}
      >
        {/* Section Title */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider text-foreground uppercase">
            Onde estamos?
          </h2>
          <div className="section-divider mt-4" />
        </div>

        {/* Map Container */}
        <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[400px] md:h-[500px]">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115206.18244903332!2d-53.53503110290529!3d-24.95759160533602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94f3d43ab8790cb7%3A0x6b445afdf444ba75!2sCascavel%2C%20PR!5e0!3m2!1spt-BR!2sbr!4v1716999999999!5m2!1spt-BR!2sbr" 
            width="100%" 
            height="100%" 
            style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(80%)' }} 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização Blackboy Films"
          />
        </div>
      </div>
    </section>
  );
}
