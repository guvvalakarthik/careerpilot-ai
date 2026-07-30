export function nearestRankPercentile(values: number[], percentile: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const bounded = Math.min(100, Math.max(0, percentile));
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((bounded / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

export function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}
