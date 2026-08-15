import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["spraoi-academy-icon.png"],
      manifest: {
        name: "Spraoi Academy",
        short_name: "Academy",
        description: "Weekly skills, practice activities, progress and rewards for young players.",
        theme_color: "#0EA5E9",
        background_color: "#F0F9FF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/spraoi-academy-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/spraoi-academy-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/spraoi-academy-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "academy-supabase-cache",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5178,
    strictPort: true,
  },
});
