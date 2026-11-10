import { MessageCircle } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";
import { WHATSAPP_URL } from "@/lib/contact";

export function WhatsAppFloat() {
  const { trackEvent } = useTracking();
  const whatsappUrl = WHATSAPP_URL;

  const handleClick = () => {
    trackEvent("click_whatsapp_floating", { page: window.location.pathname });
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="whatsapp-float group"
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white transition-transform group-hover:scale-110" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-4 px-4 py-2 bg-card rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-border/50">
        Fale Conosco
      </span>
    </a>
  );
}
