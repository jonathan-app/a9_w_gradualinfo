import Script from 'next/script';
import { env } from '@/lib/env';

/**
 * components/shared/google-tag-manager.tsx — Google Tag Manager (GTM)
 * @fileoverview Google Tag Manager (GTM) via gtm.js, com fallback noscript.
 *
 * Por que este componente existe
 * - O Google Tag Manager injeta a biblioteca gtm.js assincronamente e
 *   permite gerenciar tags, pixels de conversão e eventos centralizadamente.
 * - Usamos o componente nativo `Script` do Next.js com a estratégia
 *   `afterInteractive`, executando após a hidratação da página.
 * - Inclui o fallback `<noscript>` com iframe para rastreamento de clientes
 *   que desabilitaram JavaScript.
 * - O container ID vem de `env.gtmId` (NEXT_PUBLIC_GTM_ID).
 */
export function GoogleTagManager() {
  const gtmId = env.gtmId;

  if (!gtmId) {
    return null;
  }

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
