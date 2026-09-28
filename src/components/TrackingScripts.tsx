"use client";

import { useEffect } from "react";

const GA_ID = "G-NG3CPDVF6F";

function injectSrc(id: string, src: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.async = true;
  el.src = src;
  document.head.appendChild(el);
}

function injectInline(id: string, content: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.text = content;
  document.head.appendChild(el);
}

export function TrackingScripts() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();

  useEffect(() => {
    injectSrc("ga-src", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    injectInline(
      "ga-init",
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
    );

    if (gtmId) {
      injectInline(
        "gtm",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':Date.now(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
      );
    }

    if (clarityId) {
      injectInline(
        "clarity",
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`,
      );
    }
  }, [gtmId, clarityId]);

  return null;
}
