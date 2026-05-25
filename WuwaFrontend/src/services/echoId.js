const mainStatNumericCodes = Object.freeze({
  atk_percent: '01',
  def_percent: '02',
  hp_percent: '03',
  attribute_damage: '04',
  energy_regen: '05',
  crit_rate: '06',
  crit_damage: '07',
  healing_bonus: '08',
})

const legacyMainStatCodes = Object.freeze({
  ATK: '01',
  DEF: '02',
  HP: '03',
  DMG: '04',
  ER: '05',
  CR: '06',
  CD: '07',
  HEAL: '08',
})

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function tailDigits(value, length) {
  return digitsOnly(value).slice(-length).padStart(length, '0')
}

function padNumber(value, length) {
  return digitsOnly(value).slice(-length).padStart(length, '0')
}

function legacySuffixToSequence(value) {
  const normalized = String(value || '').replace(/[^0-9a-z]/gi, '').toUpperCase()
  const numericValue = Number.parseInt(normalized || '0', 36)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  return String(safeValue % 10000).padStart(4, '0')
}

function legacyEchoUidToNumeric(uid) {
  const match = String(uid || '').match(/^WUWA-(\d+)-S(\d+)-(\d)C-([A-Z]+)-([0-9A-Z]+)$/i)
  if (!match) {
    return null
  }
  const [, playerUid, sonataId, cost, mainStatCode, suffix] = match
  return `${tailDigits(playerUid, 3)}${padNumber(sonataId, 2)}${padNumber(cost, 1)}${legacyMainStatCodes[mainStatCode.toUpperCase()] || '00'}${legacySuffixToSequence(suffix)}`
}

export function generateNumericEchoUid({ playerUid, sonataId, cost, mainStat, sequence }) {
  const uidPart = tailDigits(playerUid, 3)
  const sonataPart = padNumber(sonataId, 2)
  const costPart = padNumber(cost, 1)
  const mainStatPart = mainStatNumericCodes[mainStat] || '00'
  const sequencePart = padNumber(sequence, 4)
  return `${uidPart}${sonataPart}${costPart}${mainStatPart}${sequencePart}`
}

export function nextEchoSequence(playerUid, storage = globalThis.localStorage) {
  const key = `wuwa-echo-sequence-${digitsOnly(playerUid) || 'unknown'}`
  const nextValue = (Number.parseInt(storage.getItem(key) || '0', 10) || 0) + 1
  storage.setItem(key, String(nextValue))
  return nextValue
}

export function displayEchoNumericId(echo) {
  if (!echo) {
    return ''
  }
  const uid = String(echo.echo_uid || '')
  if (/^\d+$/.test(uid)) {
    return uid
  }
  const legacyNumericId = legacyEchoUidToNumeric(uid)
  if (legacyNumericId) {
    return legacyNumericId
  }
  return padNumber(echo.id, 6)
}
