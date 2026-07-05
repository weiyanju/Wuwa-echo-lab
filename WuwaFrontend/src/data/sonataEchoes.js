import sonataEchoesRaw from './sonataEchoes.raw.json'

function publicEchoImagePath(image) {
  return encodeURI(`/echo-images/${image}`)
}

function freezeEcho(echo) {
  return Object.freeze({
    id: echo.id,
    name: echo.name,
    cost: echo.cost,
    image: publicEchoImagePath(echo.image),
  })
}

function freezeCostGroups(echoesByCost) {
  return Object.freeze(Object.fromEntries(Object.entries(echoesByCost).map(([costKey, echoes]) => [
    costKey,
    Object.freeze(echoes.map(freezeEcho)),
  ])))
}

export const sonataEchoes = Object.freeze(sonataEchoesRaw.sets.map((set) => Object.freeze({
  id: set.id,
  name: set.name,
  echoesByCost: freezeCostGroups(set.echoesByCost),
})))

export const sonataEchoesBySetName = Object.freeze(Object.fromEntries(sonataEchoes.map((set) => [set.name, set])))
