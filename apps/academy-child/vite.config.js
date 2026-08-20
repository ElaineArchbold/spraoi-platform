import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "favicon-192.png", "favicon-512.png"],
      manifest: {
        name: "Spraoi",
        short_name: "Spraoi",
        description: "Your club, calendar, messages, Academy missions, progress and rewards in one place.",
        theme_color: "#2563EB",
        background_color: "#F8FAFC",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/favicon-192.png?v=spraoi-20260817", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/favicon-512.png?v=spraoi-20260817", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/favicon-512.png?v=spraoi-20260817", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
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
