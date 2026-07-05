export function displayEchoName(echo, fallback = '未指定声骸') {
  if (echo?.echo_name) return echo.echo_name
  if (echo?.name) return echo.name
  if (echo?.display_name) return echo.display_name
  return fallback
}
