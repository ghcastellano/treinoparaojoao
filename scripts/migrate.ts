import { neon } from "@neondatabase/serverless";
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url)
  throw new Error("Configure DATABASE_URL antes da migração.");
const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS family_state (id text PRIMARY KEY, state jsonb NOT NULL, version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now())`;
console.log("Schema Neon pronto.");
