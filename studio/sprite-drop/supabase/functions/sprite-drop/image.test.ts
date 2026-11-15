// node --experimental-strip-types --test image.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetPath, describeFile, dimensions, fromBase64, sniff, toBase64 } from './image.ts'

// 64x32 test images, one per format (made with Pillow, stored as base64 so the test needs no files).
const IMG: Record<string, string> = {
  png: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAQ0lEQVR4nO3PQQ3AIADAQEAIwlCMrIngcVnSU9DOe/b4s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oH1EOQGAzCFF8gAAAABJRU5ErkJggg==', jpg: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCnRRRXyZ9qFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//2Q==', webp: 'UklGRkgAAABXRUJQVlA4IDwAAACQAwCdASpAACAAPm02l0ikIyIhJAgAgA2JZwB2APwAAEnCt77QAP7eEn//zBK/IN5C///PTNeYP8LAAAA=', gif: 'R0lGODdhQAAgAIEAAMhaHgAAAAAAAAAAACwAAAAAQAAgAEAISwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPnyADAgA7', webpLossless: 'UklGRiAAAABXRUJQVlA4TBMAAAAvQAAIEAcQEREAEsL/9WJE/9MTAA==',
}

test('sniff and dimensions for every accepted format', () => {
  for (const [k, mime] of [['png', 'image/png'], ['jpg', 'image/jpeg'], ['webp', 'image/webp'], ['gif', 'image/gif']] as const) {
    const b = fromBase64(IMG[k])
    assert.equal(sniff(b)?.mime, mime, k)
    assert.deepEqual(dimensions(b), { width: 64, height: 32 }, k)
  }
  assert.deepEqual(dimensions(fromBase64(IMG.webpLossless)), { width: 65, height: 33 })
})

test('non-images are refused', () => {
  assert.equal(sniff(new TextEncoder().encode('%PDF-1.7 hello')), null)
  assert.equal(sniff(new Uint8Array(0)), null)
  assert.equal(dimensions(new TextEncoder().encode('<html>')), null)
})

test('base64 round trip, with or without a data: prefix', () => {
  const b = fromBase64(IMG.png)
  assert.deepEqual(fromBase64(toBase64(b)), b)
  assert.deepEqual(fromBase64('data:image/png;base64,' + toBase64(b)), b)
})

test('storage path stays under the owner folder', () => {
  const p = assetPath('u1', 'rook-and-ruin/second wind', 'abcdef0123', '../../evil name.png', 'png')
  assert.equal(p, 'u1/rook-and-ruin-second-wind/abcdef01-evil-name.png')
  assert.ok(!p.includes('..'))
})

test('describeFile never keeps the full link', () => {
  const d = describeFile({ download_url: 'https://files.example.com/abc?sig=secret', file_id: 'file_1', mime_type: 'image/png' })
  assert.equal(d.download_host, 'files.example.com')
  assert.ok(!JSON.stringify(d).includes('secret'))
  assert.deepEqual(describeFile(undefined), { present: false })
})
