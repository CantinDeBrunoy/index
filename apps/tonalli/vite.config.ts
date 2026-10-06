import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * De quel commit vient ce qu'on regarde ?
 *
 * La question s'est posée deux fois pour rien : un déploiement qui n'était pas
 * passé, puis un service worker qui servait l'ancienne version. Le repère est
 * calculé ici, au build, et affiché tout en bas des réglages — c'est la seule
 * façon de répondre sans passer par le tableau de bord de l'hébergeur.
 *
 * Vercel et Netlify donnent le commit dans l'environnement ; en local on le
 * demande à git. Aucun des trois n'est garanti, d'où le repli sur `dev` :
 * un build sans repère reste un build valable.
 */
function buildId(): string {
  const fromHost = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_REF
  if (fromHost) return fromHost.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __BUILD_AT__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
