export function appendRollToEchoList(echoes, echoId, roll) {
  return echoes.map((echo) => {
    if (echo.id !== echoId) return echo
    const nextRolls = [...echo.substats.filter((item) => item.id !== roll.id), roll]
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return { ...echo, substats: nextRolls, status: nextRolls.length >= 5 ? 'completed' : 'in_progress', last_tuned_at: roll.tuned_at }
  })
}

export function replaceOptimisticRollInEchoList(echoes, echoId, optimisticRollId, roll) {
  return echoes.map((echo) => {
    if (echo.id !== echoId) return echo
    const nextRolls = echo.substats
      .map((item) => (item.id === optimisticRollId ? roll : item))
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return { ...echo, substats: nextRolls, status: nextRolls.length >= 5 ? 'completed' : 'in_progress', last_tuned_at: roll.tuned_at }
  })
}

export function removeOptimisticRollFromEchoList(echoes, echoId, optimisticRollId) {
  return echoes.map((echo) => {
    if (echo.id !== echoId) return echo
    const nextRolls = echo.substats.filter((item) => item.id !== optimisticRollId)
    return { ...echo, substats: nextRolls, status: nextRolls.length >= 5 ? 'completed' : 'in_progress', last_tuned_at: nextRolls.at(-1)?.tuned_at || null }
  })
}

export function buildOptimisticRollDraft(activeEcho, row, tier) {
  return {
    id: -Date.now(),
    position: (activeEcho?.substats.length || 0) + 1,
    substat_type: row.substat_type,
    tier_value: tier.value,
    enhance_phase: '',
    tuning_order: null,
    tuned_at: new Date().toISOString(),
    optimistic: true,
  }
}
