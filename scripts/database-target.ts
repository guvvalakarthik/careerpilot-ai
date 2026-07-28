const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://careerpilot:careerpilot_dev@localhost:5434/careerpilot";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
}

function isLoopbackHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (normalized === "localhost" || normalized === "::1") return true;

  const octets = normalized.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

export function describeDatabaseTarget(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")) || "(default)";
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname}${port}/${databaseName}`;
  } catch {
    return "(invalid database URL)";
  }
}

export function assertLocalDatabaseUrl(databaseUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Database safety check failed: the selected database URL is invalid.");
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(
      `Database safety check failed: ${parsed.protocol || "unknown"} is not PostgreSQL.`,
    );
  }

  if (!isLoopbackHostname(parsed.hostname)) {
    throw new Error(
      `Database safety check blocked non-local target ${describeDatabaseTarget(databaseUrl)}. ` +
        "Local scripts only accept localhost, 127.0.0.0/8, or ::1.",
    );
  }

  if (!parsed.pathname.replace(/^\/+/, "")) {
    throw new Error("Database safety check failed: the local database name is missing.");
  }

  return databaseUrl;
}

export function resolveLocalDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const selectedUrl =
    environment.LOCAL_DATABASE_URL?.trim() ||
    environment.DATABASE_URL?.trim() ||
    DEFAULT_LOCAL_DATABASE_URL;

  return assertLocalDatabaseUrl(selectedUrl);
}
