// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Matt-Site/src/main.jsx', // 👈 this tells Vite where your app is hosted
  plugins: [react()],
});
