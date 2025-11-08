import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'copy-sw',
          closeBundle() {
            // Copy service worker to dist after build
            try {
              copyFileSync(
                path.resolve(__dirname, 'public/firebase-messaging-sw.js'),
                path.resolve(__dirname, 'dist/firebase-messaging-sw.js')
              );
              console.log('✓ Copied firebase-messaging-sw.js to dist');
            } catch (err) {
              console.error('Error copying service worker:', err);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
