import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    entry: ["src/cli/index.ts"],
    format: ["cjs"],
    outDir: "dist",
    platform: "node",
    shims: false,
    sourcemap: true,
    target: "node18",
    onSuccess: "mkdir -p dist/public && cp -R src/public/. dist/public"
});
