import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * HTML racine de la version web. On y branche la PWA pour que l'app s'installe
 * proprement via « Ajouter à l'écran d'accueil » : ouverture en plein écran
 * (sans barre du navigateur), titre, icônes, couleur de thème et manifeste.
 * Le service worker, lui, est enregistré depuis src/app/_layout.tsx.
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

        {/* Ajout à l'écran d'accueil. « default » plutôt que « black-translucent » :
            ce dernier écrit l'heure et la batterie en blanc par-dessus l'en-tête
            crème, illisibles en mode clair. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cancionero" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* La barre du système prend la couleur de l'en-tête (Colors.background). */}
        <meta name="theme-color" content="#FFF6E9" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1C1015" media="(prefers-color-scheme: dark)" />
        {/* ?v= : une adresse qu'aucun cache ne connaît. À incrémenter à chaque
            nouvelle icône, avec CACHE dans public/sw.js et le manifeste. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=1" />
        <link rel="manifest" href="/manifest.webmanifest?v=1" />

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
