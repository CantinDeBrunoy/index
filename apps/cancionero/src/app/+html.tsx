import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * HTML racine de la version web. On y ajoute les balises « PWA » iOS pour que
 * l'app s'installe proprement via « Ajouter à l'écran d'accueil » : ouverture en
 * plein écran (sans barre Safari), titre, icône et couleur de thème.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <title>Cancionero</title>
        <meta name="description" content="Apprends l'espagnol en chantant." />

        {/* Ajout à l'écran d'accueil iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cancionero" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#E23A2E" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: bodyStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Fond crème dès le chargement (évite un flash blanc avant que React monte).
const bodyStyle = `
body { background-color: #FFF6E9; }
@media (prefers-color-scheme: dark) {
  body { background-color: #1C1015; }
}
`;
