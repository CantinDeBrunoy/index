/// <reference types="vite/client" />

/**
 * Repères du build, injectés par `vite.config.ts` (voir son `define`) et
 * remplacés en dur dans le bundle. Ils répondent à « est-ce que je regarde la
 * dernière version ? » sans passer par le tableau de bord de l'hébergeur.
 */
declare const __BUILD_ID__: string;
declare const __BUILD_AT__: string;
