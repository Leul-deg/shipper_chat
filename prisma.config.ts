import { config } from "dotenv";
// Load .env.local explicitly since that's where Next.js stores secrets locally
config({ path: ".env.local" });
config({ path: ".env" }); // Also load .env as fallback

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
