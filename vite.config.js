import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
});
