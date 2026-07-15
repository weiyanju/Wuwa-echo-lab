import { ref } from 'vue'

const validPages = new Set(['workspace', 'stats', 'evaluation'])

export function useDashboardNavigation({ refreshStats, refreshEvaluation }) {
  const page = ref('workspace')

  async function openPage(nextPage) {
    if (!validPages.has(nextPage)) return
    page.value = nextPage
    if (nextPage === 'stats') await refreshStats()
    if (nextPage === 'evaluation') await refreshEvaluation()
  }

  return { openPage, page }
}
