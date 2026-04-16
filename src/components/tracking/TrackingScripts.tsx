import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTrackingConfig } from "@/hooks/useTrackingConfig";

// Validation patterns for pixel IDs - prevents script injection
const PIXEL_ID_PATTERNS = {
  ga4: /^G-[A-Z0-9]{6,12}$/,      // GA4: G-XXXXXXXXXX format
  meta: /^[0-9]{15,16}$/,          // Meta: 15-16 digit numeric ID
  tiktok: /^[A-Z0-9]{18,24}$/i,    // TikTok: 18-24 alphanumeric
  gtm: /^GTM-[A-Z0-9]{7,12}$/i,    // GTM: GTM-XXXXXXX format
};

// Validates and sanitizes pixel IDs to prevent XSS
function validatePixelId(id: string, type: 'ga4' | 'meta' | 'tiktok'): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim().toUpperCase();
  if (type === 'ga4') {
    return PIXEL_ID_PATTERNS.ga4.test(trimmed) ? trimmed : null;
  }
  if (type === 'meta') {
    return PIXEL_ID_PATTERNS.meta.test(id.trim()) ? id.trim() : null;
  }
  if (type === 'tiktok') {
    return PIXEL_ID_PATTERNS.tiktok.test(id.trim()) ? id.trim() : null;
  }
  if (type === 'gtm' as any) {
    return PIXEL_ID_PATTERNS.gtm.test(id.trim()) ? id.trim().toUpperCase() : null;
  }
  return null;
}

export function TrackingScripts() {
  const { data: config, isLoading } = useTrackingConfig();
  const location = useLocation();

  // Inject GA4 script
  useEffect(() => {
    if (isLoading || !config?.ga4.enabled || !config.ga4.measurement_id) return;

    const measurementId = validatePixelId(config.ga4.measurement_id, 'ga4');
    if (!measurementId) {
      console.warn('[TrackingScripts] Invalid GA4 measurement ID format, skipping injection');
      return;
    }

    // Check if script already exists
    if (document.querySelector(`script[src*="gtag/js?id=${measurementId}"]`)) return;

    // Add gtag script
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    // Initialize gtag using safer approach
    const initScript = document.createElement("script");
    
    // Build config object safely
    const gtagConfig: Record<string, unknown> = {
      send_page_view: false,
    };
    if (config.lgpd.anonymize_ip) gtagConfig.anonymize_ip = true;
    if (config.ga4.debug_mode) gtagConfig.debug_mode = true;
    
    // Use text content with proper escaping
    const consentCode = config.lgpd.consent_mode ? `
      gtag('consent', 'default', {
        'ad_storage': 'denied',
        'analytics_storage': 'granted',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    ` : '';
    
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      ${consentCode}
      gtag('config', ${JSON.stringify(measurementId)}, ${JSON.stringify(gtagConfig)});
    `;
    document.head.appendChild(initScript);

    return () => {
      script.remove();
      initScript.remove();
    };
  }, [config, isLoading]);

  // Inject Meta Pixel script
  useEffect(() => {
    if (isLoading || !config?.meta.enabled || !config.meta.pixel_id) return;

    const pixelId = validatePixelId(config.meta.pixel_id, 'meta');
    if (!pixelId) {
      console.warn('[TrackingScripts] Invalid Meta Pixel ID format, skipping injection');
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="connect.facebook.net"]')) return;

    const script = document.createElement("script");
    
    // Use JSON.stringify to safely escape the pixel ID
    const consentCode = config.lgpd.consent_mode ? "fbq('consent', 'revoke');" : "";
    
    script.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      ${consentCode}
      fbq('init', ${JSON.stringify(pixelId)});
    `;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [config, isLoading]);

  // Inject TikTok Pixel script
  useEffect(() => {
    if (isLoading || !config?.tiktok.enabled || !config.tiktok.pixel_id) return;

    const pixelId = validatePixelId(config.tiktok.pixel_id, 'tiktok');
    if (!pixelId) {
      console.warn('[TrackingScripts] Invalid TikTok Pixel ID format, skipping injection');
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="analytics.tiktok.com"]')) return;

    const script = document.createElement("script");
    
    // Use JSON.stringify for safe pixel ID injection
    script.textContent = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load(${JSON.stringify(pixelId)});
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [config, isLoading]);
  
  // Inject Google Tag Manager (GTM) script
  useEffect(() => {
    if (isLoading || !config?.gtm?.enabled || !config.gtm.container_id) return;

    const containerId = validatePixelId(config.gtm.container_id, 'gtm' as any);
    if (!containerId) {
      console.warn('[TrackingScripts] Invalid GTM Container ID format, skipping injection');
      return;
    }

    // Check if script already exists
    if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${containerId}"]`)) return;

    // Head script
    const headScript = document.createElement("script");
    headScript.textContent = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer',${JSON.stringify(containerId)});
    `;
    document.head.appendChild(headScript);

    // NoScript (Body)
    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    return () => {
      headScript.remove();
      noscript.remove();
    };
  }, [config, isLoading]);

  // Track page views on route change
  useEffect(() => {
    if (isLoading || !config) return;

    // GA4 page view
    if (config.ga4.enabled && config.ga4.measurement_id && window.gtag) {
      const validId = validatePixelId(config.ga4.measurement_id, 'ga4');
      if (validId) {
        window.gtag("event", "page_view", {
          page_path: location.pathname,
          page_title: document.title,
          send_to: validId,
        });
      }
    }

    // Meta page view
    if (config.meta.enabled && config.meta.pixel_id && window.fbq) {
      const validId = validatePixelId(config.meta.pixel_id, 'meta');
      if (validId) {
        window.fbq("track", "PageView");
      }
    }

    // TikTok page view
    if (config.tiktok.enabled && config.tiktok.pixel_id && window.ttq) {
      const validId = validatePixelId(config.tiktok.pixel_id, 'tiktok');
      if (validId) {
        window.ttq.page();
      }
    }
  }, [location.pathname, config, isLoading]);

  return null;
}
