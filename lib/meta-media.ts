/**
 * Helpers for Meta Graph video `picture` / embed (Dynamic & single-video viewers).
 */

/**
 * Picture URLs from Graph are often signed (sig, oh, stp=…). Do NOT rewrite size
 * tokens (e.g. s160x160 → larger) — CDN returns "URL signature mismatch".
 * Only safe normalisation here.
 */
export function hqMetaPictureUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string' || !url.trim())
    return null
  const s = url.trim()
  if (s.startsWith('//'))
    return `https:${s}`
  return s
}

/** Default Facebook embed is 480×480 — scale to 1280×720 in the modal */
export function hqMetaEmbedHtml(html: string | null | undefined): string {
  if (html == null || typeof html !== 'string')
    return ''
  return html
    .replace(/width="480"/g, 'width="1280"')
    .replace(/height="480"/g, 'height="720"')
    .replace(/width='480'/g, 'width=\'1280\'')
    .replace(/height='480'/g, 'height=\'720\'')
}
