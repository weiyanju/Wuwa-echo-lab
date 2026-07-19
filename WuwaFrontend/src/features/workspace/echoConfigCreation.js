import { mainStatLabels } from '../../data/substats.js'

export function echoConfigMatches(echo, config) {
  return Boolean(echo)
    && echo.set_name === config.sonata
    && Number(echo.cost) === Number(config.cost)
    && echo.main_stat === config.main_stat
}

export function formatConfigCreationNotice(config) {
  return `已新建：${config.sonata} · COST ${config.cost} · ${mainStatLabels[config.main_stat] || config.main_stat}`
}

export function createConfigCreationNoticeController(notice, delay = 2600) {
  let timer = null
  function clear() {
    clearTimeout(timer)
    timer = null
    notice.value = ''
  }
  function announce(config) {
    clear()
    notice.value = formatConfigCreationNotice(config)
    timer = setTimeout(clear, delay)
  }
  return { announce, clear }
}
