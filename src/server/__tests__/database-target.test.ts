import { describe, expect, it } from "vitest";
import {
  assertLocalDatabaseUrl,
  describeDatabaseTarget,
  resolveLocalDatabaseUrl,
} from "../../../scripts/database-target";

describe("database target safety", () => {
  it.each([
    "postgresql://user:password@localhost:5434/careerpilot",
    "postgres://user:password@127.0.0.1:5432/careerpilot",
    "postgresql://user:password@[::1]:5432/careerpilot",
    "postgresql://user:password@127.42.0.8:5432/careerpilot",
  ])("accepts a loopback PostgreSQL target: %s", (databaseUrl) => {
    expect(assertLocalDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it.each([
    "postgresql://user:password@ep-example.neon.tech/careerpilot",
    "postgresql://user:password@10.0.0.5/careerpilot",
    "postgresql://user:password@postgres:5432/careerpilot",
    "mysql://user:password@localhost/careerpilot",
    "not-a-url",
  ])("rejects an unsafe or invalid target: %s", (databaseUrl) => {
    expect(() => assertLocalDatabaseUrl(databaseUrl)).toThrow(/safety check/i);
  });

  it("requires an explicit database name", () => {
    expect(() =>
      assertLocalDatabaseUrl("postgresql://user:password@localhost:5434"),
    ).toThrow(/database name/i);
  });

  it("allows an explicit local override when the application URL is remote", () => {
    expect(
      resolveLocalDatabaseUrl({
        DATABASE_URL: "postgresql://user:password@ep-example.neon.tech/production",
        LOCAL_DATABASE_URL: "postgresql://user:password@localhost:5434/careerpilot",
      }),
    ).toContain("@localhost:5434/careerpilot");
  });

  it("never exposes credentials when describing a target", () => {
    expect(
      describeDatabaseTarget(
        "postgresql://secret-user:secret-password@localhost:5434/careerpilot?sslmode=require",
      ),
    ).toBe("postgresql://localhost:5434/careerpilot");
  });
});
