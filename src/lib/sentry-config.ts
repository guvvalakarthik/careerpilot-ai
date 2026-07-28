export const DEFAULT_SENTRY_TRACES_SAMPLE_RATE = 0.1;

export function parseSentrySampleRate(value: string | undefined): number {
  if (!value?.trim()) {
    return DEFAULT_SENTRY_TRACES_SAMPLE_RATE;
  }

  const sampleRate = Number(value);
  return Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1
    ? sampleRate
    : DEFAULT_SENTRY_TRACES_SAMPLE_RATE;
}
