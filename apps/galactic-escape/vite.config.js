import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Le jeu de 2022 tournait sous Create React App ; Vite le construit désormais comme les autres apps du
// monorepo. Les modèles 3D (.glb) sont des fichiers servis tels quels, importés par leur URL.
export default defineConfig({
    plugins: [react()],
    assetsInclude: ['**/*.glb'],
    test: {
        globals: true,
        // Les constantes du jeu lisent la taille de la fenêtre dès leur import.
        environment: 'jsdom',
    },
});
