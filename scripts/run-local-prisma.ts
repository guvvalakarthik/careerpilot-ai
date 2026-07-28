import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { describeDatabaseTarget, resolveLocalDatabaseUrl } from "./database-target";

const prismaArguments = process.argv.slice(2);

if (prismaArguments.length === 0) {
  console.error("Usage: tsx scripts/run-local-prisma.ts <prisma arguments>");
  process.exit(1);
}

try {
  const databaseUrl = resolveLocalDatabaseUrl();
  const require = createRequire(import.meta.url);
  const prismaCli = require.resolve("prisma/build/index.js");

  console.log(`[db-safety] Local target verified: ${describeDatabaseTarget(databaseUrl)}`);

  const result = spawnSync(process.execPath, [prismaCli, ...prismaArguments], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
