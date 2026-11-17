// spitz.dev art worker: which image model to use, what an OpenAI error means, and what a call cost.
// Small on purpose: a preferred model per priority, a cached list of what the account has, safe fallback.

export type Priority = 'quality' | 'speed' | 'cost'
export type ErrorKind = 'no_credits' | 'bad_key' | 'permission' | 'invalid_model' | 'incompatible' | 'rate_limit' | 'server' | 'content' | 'other'

export class OpenAIError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

/** What went wrong, and whether trying another model (or once more) could help. */
export function classify(e: unknown): { kind: ErrorKind; fallback: boolean; retrySame: boolean; plain: string } {
  const status = e instanceof OpenAIError ? e.status : 0
  const code = e instanceof OpenAIError ? e.code : ''
  const msg = e instanceof Error ? e.message : String(e)
  if (code === 'insufficient_quota' || /quota|billing|credit/i.test(msg)) return { kind: 'no_credits', fallback: false, retrySame: false, plain: 'The OpenAI account is out of credits (or hit its monthly limit). Add credits on platform.openai.com, then hand the task back.' }
  if (status === 401) return { kind: 'bad_key', fallback: false, retrySame: false, plain: 'OpenAI rejected the API key. Check OPENAI_API_KEY in the Supabase Edge Function secrets.' }
  if (status === 404 || code === 'model_not_found' || /does not exist|not found/i.test(msg)) return { kind: 'invalid_model', fallback: true, retrySame: false, plain: 'That image model is not available (renamed or retired).' }
  if (status === 403 || /verif|permission|not allowed|do not have access/i.test(msg)) return { kind: 'permission', fallback: true, retrySame: false, plain: 'The API key or organization is not allowed to use that model (key permissions or organization verification).' }
  if (status === 400 && (code === 'moderation_blocked' || /safety system|moderation|content policy/i.test(msg))) return { kind: 'content', fallback: false, retrySame: false, plain: "OpenAI's safety filter refused this picture. Change the description in the brief, then hand the task back." }
  if (status === 429) return { kind: 'rate_limit', fallback: false, retrySame: true, plain: 'OpenAI rate limit: too many requests at once.' }
  if (status >= 500) return { kind: 'server', fallback: false, retrySame: true, plain: 'OpenAI had a server error.' }
  if (status === 400 && /background|transparen|size|quality|output_format|unsupported|invalid value/i.test(msg)) return { kind: 'incompatible', fallback: true, retrySame: false, plain: 'That model does not support what this picture needs (transparent PNG at this size).' }
  return { kind: 'other', fallback: false, retrySame: false, plain: 'Unexpected error.' }
}

/** Rank the account's image models for a priority. Only Images-API image models (gpt-image*, chatgpt-image*). */
export function rank(ids: string[], priority: Priority): string[] {
  const img = [...new Set(ids.filter(id => /^(gpt-image|chatgpt-image)/.test(id)))]
  const ver = (id: string) => Number((/(\d+(?:\.\d+)?)/.exec(id.replace(/^gpt-image-|^chatgpt-image-/, '')) || [, '0'])[1])
  const tier = (id: string) => /mini|nano/.test(id) ? 2 : /flare|fast/.test(id) ? 1 : 0 // 0 = full, 1 = fast, 2 = small
  const want: Record<Priority, number[]> = { quality: [0, 1, 2], speed: [1, 2, 0], cost: [2, 1, 0] }
  const order = want[priority]
  // dated snapshots (…-2026-10-01) after the plain alias
  return img.sort((a, b) => order.indexOf(tier(a)) - order.indexOf(tier(b)) || ver(b) - ver(a) || Number(/\d{4}-\d\d-\d\d/.test(a)) - Number(/\d{4}-\d\d-\d\d/.test(b)) || a.localeCompare(b))
}

/** Candidates in the order to try: preferred model first, then the ranked list, never the same model twice. */
export function candidates(preferred: string | null | undefined, available: string[] | null, priority: Priority, skip: string[] = []): string[] {
  const list = [...(preferred ? [preferred] : []), ...rank(available || [], priority)]
  return [...new Set(list)].filter(m => !skip.includes(m))
}

export type Rates = { 'gpt-image'?: { text_in?: number; image_in?: number; image_out?: number }; text?: Record<string, { in?: number; out?: number }> }

/** Estimated USD from the usage OpenAI returns (token counts). null when there is nothing to go on. */
export function imageCost(usage: any, rates: Rates): number | null {
  const r = rates['gpt-image']; if (!usage || !r) return null
  const d = usage.input_tokens_details || {}
  const textIn = d.text_tokens ?? usage.input_tokens ?? 0, imageIn = d.image_tokens ?? 0, out = usage.output_tokens ?? 0
  return ((textIn * (r.text_in || 0)) + (imageIn * (r.image_in || 0)) + (out * (r.image_out || 0))) / 1e6
}
export function textCost(model: string, usage: any, rates: Rates): number | null {
  const r = rates.text?.[model]; if (!usage || !r) return null
  return (((usage.input_tokens || 0) * (r.in || 0)) + ((usage.output_tokens || 0) * (r.out || 0))) / 1e6
}
