"use client";

import Script from "next/script";
import { isAnalyticsEnabled } from "@/lib/analytics";

interface GoogleAnalyticsScriptProps {
  GA_MEASUREMENT_ID: string;
}

export function GoogleAnalyticsScript({
  GA_MEASUREMENT_ID,
}: GoogleAnalyticsScriptProps) {
  if (!isAnalyticsEnabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Google Analytics script loaded successfully");
        }}
        onError={() => {
          console.error("Failed to load Google Analytics script");
        }}
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: false,
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
