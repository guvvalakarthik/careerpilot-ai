const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/health",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/register",
  "/api/forgot-password",
  "/api/reset-password",
  "/api/cron",
  "/api/inngest",
];

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}
