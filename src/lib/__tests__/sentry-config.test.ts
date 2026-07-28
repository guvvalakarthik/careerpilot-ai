import { describe, expect, it } from "vitest";
import {
  DEFAULT_SENTRY_TRACES_SAMPLE_RATE,
  parseSentrySampleRate,
} from "@/lib/sentry-config";

describe("parseSentrySampleRate", () => {
  it.each([
    [undefined, DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["   ", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["-0.1", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["1.1", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["not-a-number", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["Infinity", DEFAULT_SENTRY_TRACES_SAMPLE_RATE],
    ["0", 0],
    ["0.25", 0.25],
    ["1", 1],
  ])("maps %s to %s", (value, expected) => {
    expect(parseSentrySampleRate(value)).toBe(expected);
  });
});
