import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/workoutapp/").
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Overload",
        short_name: "Overload",
        description: "Personal workout log",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#15181e",
        theme_color: "#15181e",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: base + "index.html",
        // Never intercept Supabase API calls.
        navigateFallbackDenylist: [/supabase/],
        runtimeCaching: [],
      },
    }),
  ],
});
