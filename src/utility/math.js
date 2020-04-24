export function getRandomUnity() {
    const rand = Math.random()
    if (rand < 0.333) return -1
    if (rand > 0.666) return 1
    return 0
  }