export interface CountryOption {
  code: string
  label: string
}

/** Default for CRM company forms when ViaCEP fills the address. */
export const DEFAULT_COUNTRY_LABEL = 'Brasil'

/**
 * Curated country list for CRM company address (labels in Portuguese).
 * Preferites listed first; the rest are alphabetically sorted by label.
 */
const PRIORITY_CODES = ['BR', 'PT', 'US', 'AR', 'UY', 'PY', 'CL', 'BO', 'CO', 'PE', 'MX', 'ES', 'IT', 'DE', 'FR', 'GB', 'CA'] as const

const ALL_COUNTRIES: CountryOption[] = [
  { code: 'AF', label: 'Afeganistão' },
  { code: 'ZA', label: 'África do Sul' },
  { code: 'AL', label: 'Albânia' },
  { code: 'DE', label: 'Alemanha' },
  { code: 'AD', label: 'Andorra' },
  { code: 'AO', label: 'Angola' },
  { code: 'SA', label: 'Arábia Saudita' },
  { code: 'DZ', label: 'Argélia' },
  { code: 'AR', label: 'Argentina' },
  { code: 'AM', label: 'Armênia' },
  { code: 'AU', label: 'Austrália' },
  { code: 'AT', label: 'Áustria' },
  { code: 'AZ', label: 'Azerbaijão' },
  { code: 'BD', label: 'Bangladesh' },
  { code: 'BE', label: 'Bélgica' },
  { code: 'BZ', label: 'Belize' },
  { code: 'BO', label: 'Bolívia' },
  { code: 'BA', label: 'Bósnia e Herzegovina' },
  { code: 'BW', label: 'Botsuana' },
  { code: 'BR', label: 'Brasil' },
  { code: 'BN', label: 'Brunei' },
  { code: 'BG', label: 'Bulgária' },
  { code: 'CV', label: 'Cabo Verde' },
  { code: 'CM', label: 'Camarões' },
  { code: 'KH', label: 'Camboja' },
  { code: 'CA', label: 'Canadá' },
  { code: 'QA', label: 'Catar' },
  { code: 'KZ', label: 'Cazaquistão' },
  { code: 'CL', label: 'Chile' },
  { code: 'CN', label: 'China' },
  { code: 'CY', label: 'Chipre' },
  { code: 'SG', label: 'Cingapura' },
  { code: 'CO', label: 'Colômbia' },
  { code: 'KR', label: 'Coreia do Sul' },
  { code: 'CI', label: 'Costa do Marfim' },
  { code: 'CR', label: 'Costa Rica' },
  { code: 'HR', label: 'Croácia' },
  { code: 'CU', label: 'Cuba' },
  { code: 'DK', label: 'Dinamarca' },
  { code: 'EG', label: 'Egito' },
  { code: 'SV', label: 'El Salvador' },
  { code: 'AE', label: 'Emirados Árabes Unidos' },
  { code: 'EC', label: 'Equador' },
  { code: 'SK', label: 'Eslováquia' },
  { code: 'SI', label: 'Eslovênia' },
  { code: 'ES', label: 'Espanha' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'EE', label: 'Estônia' },
  { code: 'ET', label: 'Etiópia' },
  { code: 'PH', label: 'Filipinas' },
  { code: 'FI', label: 'Finlândia' },
  { code: 'FR', label: 'França' },
  { code: 'GA', label: 'Gabão' },
  { code: 'GH', label: 'Gana' },
  { code: 'GE', label: 'Geórgia' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'GR', label: 'Grécia' },
  { code: 'GT', label: 'Guatemala' },
  { code: 'GY', label: 'Guiana' },
  { code: 'GN', label: 'Guiné' },
  { code: 'HT', label: 'Haiti' },
  { code: 'HN', label: 'Honduras' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'HU', label: 'Hungria' },
  { code: 'YE', label: 'Iêmen' },
  { code: 'IN', label: 'Índia' },
  { code: 'ID', label: 'Indonésia' },
  { code: 'IQ', label: 'Iraque' },
  { code: 'IE', label: 'Irlanda' },
  { code: 'IS', label: 'Islândia' },
  { code: 'IL', label: 'Israel' },
  { code: 'IT', label: 'Itália' },
  { code: 'JM', label: 'Jamaica' },
  { code: 'JP', label: 'Japão' },
  { code: 'JO', label: 'Jordânia' },
  { code: 'KW', label: 'Kuwait' },
  { code: 'LA', label: 'Laos' },
  { code: 'LV', label: 'Letônia' },
  { code: 'LB', label: 'Líbano' },
  { code: 'LY', label: 'Líbia' },
  { code: 'LT', label: 'Lituânia' },
  { code: 'LU', label: 'Luxemburgo' },
  { code: 'MO', label: 'Macau' },
  { code: 'MK', label: 'Macedônia do Norte' },
  { code: 'MG', label: 'Madagascar' },
  { code: 'MY', label: 'Malásia' },
  { code: 'MW', label: 'Malawi' },
  { code: 'MV', label: 'Maldivas' },
  { code: 'MT', label: 'Malta' },
  { code: 'MA', label: 'Marrocos' },
  { code: 'MU', label: 'Maurício' },
  { code: 'MX', label: 'México' },
  { code: 'MZ', label: 'Moçambique' },
  { code: 'MD', label: 'Moldávia' },
  { code: 'MN', label: 'Mongólia' },
  { code: 'ME', label: 'Montenegro' },
  { code: 'NA', label: 'Namíbia' },
  { code: 'NP', label: 'Nepal' },
  { code: 'NI', label: 'Nicarágua' },
  { code: 'NE', label: 'Níger' },
  { code: 'NG', label: 'Nigéria' },
  { code: 'NO', label: 'Noruega' },
  { code: 'NZ', label: 'Nova Zelândia' },
  { code: 'OM', label: 'Omã' },
  { code: 'NL', label: 'Países Baixos' },
  { code: 'PA', label: 'Panamá' },
  { code: 'PK', label: 'Paquistão' },
  { code: 'PY', label: 'Paraguai' },
  { code: 'PE', label: 'Peru' },
  { code: 'PL', label: 'Polônia' },
  { code: 'PR', label: 'Porto Rico' },
  { code: 'PT', label: 'Portugal' },
  { code: 'KE', label: 'Quênia' },
  { code: 'KG', label: 'Quirguistão' },
  { code: 'CZ', label: 'República Tcheca' },
  { code: 'DO', label: 'República Dominicana' },
  { code: 'RO', label: 'Romênia' },
  { code: 'RW', label: 'Ruanda' },
  { code: 'RU', label: 'Rússia' },
  { code: 'SN', label: 'Senegal' },
  { code: 'RS', label: 'Sérvia' },
  { code: 'SY', label: 'Síria' },
  { code: 'SO', label: 'Somália' },
  { code: 'LK', label: 'Sri Lanka' },
  { code: 'SE', label: 'Suécia' },
  { code: 'CH', label: 'Suíça' },
  { code: 'SR', label: 'Suriname' },
  { code: 'TH', label: 'Tailândia' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'TZ', label: 'Tanzânia' },
  { code: 'TL', label: 'Timor-Leste' },
  { code: 'TG', label: 'Togo' },
  { code: 'TT', label: 'Trinidad e Tobago' },
  { code: 'TN', label: 'Tunísia' },
  { code: 'TR', label: 'Turquia' },
  { code: 'UA', label: 'Ucrânia' },
  { code: 'UG', label: 'Uganda' },
  { code: 'UY', label: 'Uruguai' },
  { code: 'UZ', label: 'Uzbequistão' },
  { code: 'VE', label: 'Venezuela' },
  { code: 'VN', label: 'Vietnã' },
  { code: 'ZM', label: 'Zâmbia' },
  { code: 'ZW', label: 'Zimbábue' },
]

const byCode = new Map(ALL_COUNTRIES.map(country => [country.code, country]))

export const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const priority = PRIORITY_CODES
    .map(code => byCode.get(code))
    .filter((c): c is CountryOption => Boolean(c))
  const rest = ALL_COUNTRIES
    .filter(c => !(PRIORITY_CODES as readonly string[]).includes(c.code))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return [...priority, ...rest]
})()

export function findCountryByLabel(label: string | null | undefined): CountryOption | null {
  if (!label)
    return null
  const normalized = label.trim().toLowerCase()
  return COUNTRY_OPTIONS.find(c => c.label.toLowerCase() === normalized) || null
}
