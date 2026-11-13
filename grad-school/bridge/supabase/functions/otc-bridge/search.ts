// Search helpers (pure; tested by search.test.ts). Used by the search_materials tool.

/** Lower-case words of a query, ignoring tiny words. A quoted phrase stays one term. */
export function queryTerms(q: string): string[] {
  const out: string[] = []
  q.replace(/"([^"]+)"|(\S+)/g, (_m, phrase, word) => { const t = String(phrase ?? word).toLowerCase().trim(); if (t.length > 1) out.push(t); return '' })
  return out.slice(0, 8)
}

/** How well a text matches: every term must appear; more hits score higher. 0 = no match. */
export function score(text: string, terms: string[]): number {
  if (!terms.length) return 0
  const low = text.toLowerCase()
  let total = 0
  for (const t of terms) {
    let n = 0, i = low.indexOf(t)
    while (i !== -1 && n < 50) { n++; i = low.indexOf(t, i + t.length) }
    if (!n) return 0
    total += n
  }
  return total
}

/** Up to `max` short excerpts around the first hits, with page numbers when the text has "--- Page N ---" markers. */
export function snippets(text: string, terms: string[], max = 2, width = 160): { page: number | null; text: string }[] {
  const low = text.toLowerCase()
  const hits: number[] = []
  for (const t of terms) { const i = low.indexOf(t); if (i !== -1) hits.push(i) }
  hits.sort((a, b) => a - b)
  const out: { page: number | null; text: string }[] = []
  let last = -Infinity
  for (const h of hits) {
    if (h - last < width) continue
    last = h
    const start = Math.max(0, h - width / 2), end = Math.min(text.length, h + width / 2)
    const before = text.lastIndexOf('--- Page ', h)
    const page = before === -1 ? null : Number(text.slice(before + 9).match(/^\d+/)?.[0] ?? '') || null
    out.push({ page, text: (start > 0 ? '…' : '') + text.slice(start, end).replace(/--- Page \d+ ---/g, ' ').replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '') })
    if (out.length >= max) break
  }
  return out
}
