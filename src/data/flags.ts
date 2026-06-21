export const CODE_TO_ISO: Record<string, string> = {
  MEX: 'mx',
  CRO: 'hr',
  ECU: 'ec',
  KSA: 'sa',
  CAN: 'ca',
  BEL: 'be',
  MAR: 'ma',
  JPN: 'jp',
  USA: 'us',
  URU: 'uy',
  SEN: 'sn',
  KOR: 'kr',
  ARG: 'ar',
  NGA: 'ng',
  AUS: 'au',
  IRN: 'ir',
  FRA: 'fr',
  SUI: 'ch',
  GHA: 'gh',
  QAT: 'qa',
  BRA: 'br',
  COL: 'co',
  EGY: 'eg',
  CRC: 'cr',
  ENG: 'gb-eng',
  DEN: 'dk',
  CIV: 'ci',
  NZL: 'nz',
  ESP: 'es',
  SRB: 'rs',
  CMR: 'cm',
  PAN: 'pa',
  GER: 'de',
  POL: 'pl',
  TUN: 'tn',
  JAM: 'jm',
  POR: 'pt',
  NED: 'nl',
  MLI: 'ml',
  UZB: 'uz',
  ITA: 'it',
  SWE: 'se',
  ALG: 'dz',
  HON: 'hn',
  AUT: 'at',
  PER: 'pe',
  COD: 'cd',
  CUW: 'cw',
  RSA: 'za',
  CZE: 'cz',
  BIH: 'ba',
  HAI: 'ht',
  SCO: 'gb-sct',
  PAR: 'py',
  TUR: 'tr',
  CPV: 'cv',
  IRQ: 'iq',
  NOR: 'no',
  JOR: 'jo',
}

export function flagUrl(code: string): string | null {
  const iso = CODE_TO_ISO[code]
  return iso ? `https://flagcdn.com/${iso}.svg` : null
}

interface TeamI18n {
  es: string
  iso: string
}

const TEAMS: Record<string, TeamI18n> = {
  algeria: { es: 'Argelia', iso: 'dz' },
  argentina: { es: 'Argentina', iso: 'ar' },
  australia: { es: 'Australia', iso: 'au' },
  austria: { es: 'Austria', iso: 'at' },
  belgium: { es: 'Bélgica', iso: 'be' },
  'bosnia & herzegovina': { es: 'Bosnia y Herzegovina', iso: 'ba' },
  brazil: { es: 'Brasil', iso: 'br' },
  canada: { es: 'Canadá', iso: 'ca' },
  'cape verde': { es: 'Cabo Verde', iso: 'cv' },
  colombia: { es: 'Colombia', iso: 'co' },
  'congo dr': { es: 'RD Congo', iso: 'cd' },
  'dr congo': { es: 'RD Congo', iso: 'cd' },
  croatia: { es: 'Croacia', iso: 'hr' },
  curacao: { es: 'Curazao', iso: 'cw' },
  'czech republic': { es: 'Rep. Checa', iso: 'cz' },
  ecuador: { es: 'Ecuador', iso: 'ec' },
  egypt: { es: 'Egipto', iso: 'eg' },
  england: { es: 'Inglaterra', iso: 'gb-eng' },
  france: { es: 'Francia', iso: 'fr' },
  germany: { es: 'Alemania', iso: 'de' },
  ghana: { es: 'Ghana', iso: 'gh' },
  haiti: { es: 'Haití', iso: 'ht' },
  iran: { es: 'Irán', iso: 'ir' },
  iraq: { es: 'Irak', iso: 'iq' },
  'ivory coast': { es: 'Costa de Marfil', iso: 'ci' },
  japan: { es: 'Japón', iso: 'jp' },
  jordan: { es: 'Jordania', iso: 'jo' },
  mexico: { es: 'México', iso: 'mx' },
  morocco: { es: 'Marruecos', iso: 'ma' },
  netherlands: { es: 'Países Bajos', iso: 'nl' },
  'new zealand': { es: 'Nueva Zelanda', iso: 'nz' },
  norway: { es: 'Noruega', iso: 'no' },
  panama: { es: 'Panamá', iso: 'pa' },
  paraguay: { es: 'Paraguay', iso: 'py' },
  portugal: { es: 'Portugal', iso: 'pt' },
  qatar: { es: 'Catar', iso: 'qa' },
  'saudi arabia': { es: 'Arabia Saudita', iso: 'sa' },
  scotland: { es: 'Escocia', iso: 'gb-sct' },
  senegal: { es: 'Senegal', iso: 'sn' },
  'south africa': { es: 'Sudáfrica', iso: 'za' },
  'south korea': { es: 'Corea del Sur', iso: 'kr' },
  spain: { es: 'España', iso: 'es' },
  sweden: { es: 'Suecia', iso: 'se' },
  switzerland: { es: 'Suiza', iso: 'ch' },
  tunisia: { es: 'Túnez', iso: 'tn' },
  turkey: { es: 'Turquía', iso: 'tr' },
  turkiye: { es: 'Turquía', iso: 'tr' },
  usa: { es: 'Estados Unidos', iso: 'us' },
  'united states': { es: 'Estados Unidos', iso: 'us' },
  uruguay: { es: 'Uruguay', iso: 'uy' },
  uzbekistan: { es: 'Uzbekistán', iso: 'uz' },
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

const ISO_BY_NAME: Record<string, string> = {}
for (const key in TEAMS) {
  const t = TEAMS[key]
  ISO_BY_NAME[key] = t.iso
  ISO_BY_NAME[normalize(t.es)] = t.iso
}

export function flagUrlByName(name: string): string | null {
  const iso = ISO_BY_NAME[normalize(name)]
  return iso ? `https://flagcdn.com/${iso}.svg` : null
}
