import { neon } from "@neondatabase/serverless";
import { initialState, type State } from "./engine";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
export const localMode = () =>
  process.env.ENABLE_LOCAL_STORE === "true" && !process.env.VERCEL;
export function configured() {
  return Boolean(
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length >= 32 &&
    process.env.FAMILY_PASSWORD &&
    process.env.FAMILY_PASSWORD.length >= 12 &&
    (process.env.DATABASE_URL || localMode()),
  );
}
const household = () => process.env.HOUSEHOLD_ID || "joao";
let localLock = Promise.resolve();
async function localTransaction<T>(fn: (s: State) => T): Promise<T> {
  const previous = localLock;
  let release!: () => void;
  localLock = new Promise<void>((r) => {
    release = r;
  });
  await previous;
  try {
    const folder = path.join(process.cwd(), ".local-data");
    await mkdir(folder, { recursive: true });
    const file = path.join(
      folder,
      `${household().replace(/[^a-zA-Z0-9_-]/g, "")}.json`,
    );
    let s: State;
    try {
      s = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      s = initialState();
    }
    const result = fn(s);
    await writeFile(`${file}.tmp`, JSON.stringify(s), { mode: 0o600 });
    await rename(`${file}.tmp`, file);
    return result;
  } finally {
    release();
  }
}
export async function transaction<T>(fn: (state: State) => T): Promise<T> {
  if (localMode() && !process.env.DATABASE_URL) return localTransaction(fn);
  if (!process.env.DATABASE_URL)
    throw new Error("Banco de dados não configurado.");
  const sql = neon(process.env.DATABASE_URL);
  const key = household();
  // Schema is installed with npm run db:migrate, never during every request.
  for (let retry = 0; retry < 6; retry++) {
    const rows =
      await sql`SELECT state, version FROM family_state WHERE id=${key}`;
    if (!rows.length) {
      await sql`INSERT INTO family_state(id,state) VALUES(${key},${JSON.stringify(initialState())}::jsonb) ON CONFLICT DO NOTHING`;
      continue;
    }
    const state = rows[0].state as State;
    const result = fn(state);
    const updated =
      await sql`UPDATE family_state SET state=${JSON.stringify(state)}::jsonb, version=version+1, updated_at=now() WHERE id=${key} AND version=${rows[0].version} RETURNING version`;
    if (updated.length) return result;
  }
  throw new Error("Outra ação está sendo salva. Tente novamente.");
}
