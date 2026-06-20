const ALIAS: Record<string, string> = {
  unitedstates: 'usa',
  czechia: 'czechrepublic',
  southkorea: 'korearepublic',
  iran: 'iriran',
  congodr: 'drcongo',
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function canon(s: string): string {
  const n = norm(s)
  return ALIAS[n] ?? n
}

export function sameTeam(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const na = canon(a)
  const nb = canon(b)
  if (na === nb) return true
  return na.length >= 4 && nb.length >= 4 && (na.startsWith(nb.slice(0, 4)) || nb.startsWith(na.slice(0, 4)))
}
