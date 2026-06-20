import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Split Firebase into sub-packages
          if (id.includes('firebase/auth')) {
            return 'firebase-auth';
          }
          if (id.includes('firebase/firestore')) {
            return 'firebase-firestore';
          }
          if (id.includes('firebase/analytics')) {
            return 'firebase-analytics';
          }
          if (id.includes('firebase/app') || 
              id.includes('@firebase')) {
            return 'firebase-core';
          }
          // Gemini separate
          if (id.includes('@google/generative-ai') ||
              id.includes('@google/genai')) {
            return 'gemini';
          }
          // Charts separate
          if (id.includes('recharts') || 
              id.includes('d3-')) {
            return 'charts';
          }
          // React core
          if (id.includes('react-dom') || 
              id.includes('react-router')) {
            return 'vendor';
          }
          // React Query
          if (id.includes('@tanstack')) {
            return 'query';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app']
  }
});
