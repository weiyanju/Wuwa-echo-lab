export function sortVisibleEchoHistory(echoes) {
  return [...echoes]
    .filter((echo) => echo.substats.length > 0 || echo.status === 'archived')
    .sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))
}

export function isReusableDraft(echo) {
  return Boolean(echo && echo.status !== 'archived' && echo.substats.length === 0)
}

export function statusBadge(echo, activeEchoId) {
  if (!echo) {
    return ''
  }
  if (echo.status === 'archived') {
    return '弃置'
  }
  if (echo.id === activeEchoId) {
    return '当前录入'
  }
  if (echo.substats.length > 0 && echo.substats.length < 5) {
    return '待强化'
  }
  if (echo.substats.length >= 5) {
    return '已强化'
  }
  return ''
}

export function buildNextEchoConfig(echo) {
  return {
    sonata: echo.set_name,
    cost: echo.cost,
    main_stat: echo.main_stat,
    is_continuous_tuning: true,
  }
}
