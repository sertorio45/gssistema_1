/** Resposta do serviço de criativos Meta (Marketing API) */

export type MetaCreativeType = 'image' | 'video' | 'carousel' | 'dynamic'

export interface MetaCreativeMediaItem {
  type: 'image' | 'video'
  /** Imagem: URL original. Vídeo: URL do MP4 (source); vazio se só preview/embed */
  url: string
  /** Preview em boa resolução (picture do vídeo ou url da imagem) — nunca thumbnail_url 160px do feed */
  thumbnail: string | null
  width: number | null
  height: number | null
  duration?: number | null
  video_id?: string | null
  /** iframe do Facebook quando `source` não está disponível (permissão página) */
  embed_html?: string | null
  /** Sem MP4 nem embed_html — só imagem estática (picture/thumbnail) */
  preview_only?: boolean
}

export interface MetaCreativeCopy {
  bodies: string[]
  titles: string[]
  cta: string | null
  call_to_action_types: string[]
}

export interface MetaAdCreativePayload {
  ad_id: string
  ad_name: string | null
  creative_id: string | null
  creative_type: MetaCreativeType
  medias: MetaCreativeMediaItem[]
  copy: MetaCreativeCopy
  /** Primeira miniatura em alta para o card (não usar thumbnail_url pequeno do feed) */
  preview_thumbnail: string | null
}

export interface MetaCreativesApiResponse {
  data: MetaAdCreativePayload[]
  api_version: string
}
