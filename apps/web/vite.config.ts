import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [devtools(), tanstackRouter(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
