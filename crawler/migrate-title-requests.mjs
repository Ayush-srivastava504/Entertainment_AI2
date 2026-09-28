import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPool } from "./db.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, "..", "db", "migrations", "20260929_title_requests.sql");

async function main() {
  const sql = readFileSync(migrationPath, "utf-8");
  console.log(`Applying ${migrationPath} ...`);
  await getPool().query(sql);
  console.log("Title request table is ready.");
  await getPool().end();
}

main().catch((err) => {
  console.error("Title request migration failed:", err);
  process.exit(1);
});