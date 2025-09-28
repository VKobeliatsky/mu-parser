import { defineConfig } from "tsup";

const entries = ["src/index.ts"];
export default defineConfig([
  // CommonJS build
  {
    entry: entries,
    format: ["cjs"],
    dts: true,
    clean: true,
    platform: "node",
    outDir: "dist/cjs",
    target: "es2018",
    sourcemap: true,
  },
  // ESM build
  {
    entry: entries,
    format: ["esm"],
    dts: true,
    clean: true,
    minify: true,
    platform: "neutral",
    outDir: "dist/esm",
    target: "es2018",
    sourcemap: true,
  },
  // Browser IIFE build
  {
    entry: entries,
    format: ["iife"],
    globalName: "MuParser",
    clean: true,
    minify: true,
    platform: "browser",
    outDir: "dist/browser",
    target: "es2018",
    sourcemap: true,
  },
]);
