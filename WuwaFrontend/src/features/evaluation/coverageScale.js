const FRIENDLY_COVERAGE_MAXES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]

export function getCoverageScale(values = []) {
  const dataMax = Math.max(
    0,
    ...values
      .filter(Number.isFinite)
      .map((value) => Math.min(Math.max(value, 0), 1)),
  )
  const targetMax = dataMax <= 0.2 ? 0.2 : dataMax * 1.1
  const max = FRIENDLY_COVERAGE_MAXES.find((candidate) => candidate >= targetMax) ?? 1

  return {
    max,
    ticks: [0, max / 2, max],
  }
}
