export function genID(pre = 'id-') {
  return `${pre}${Date.now()}-${Math.random().toString(36).substring(0, 8)}`
}

//`id-${genID().replace(/-/g, '')}`
