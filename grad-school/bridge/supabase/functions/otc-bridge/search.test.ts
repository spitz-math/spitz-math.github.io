// Run: node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/search.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { queryTerms, score, snippets } from './search.ts'

test('terms keep quoted phrases', () => {
  assert.deepEqual(queryTerms('standardized "high stakes" a testing'), ['high stakes', 'standardized', 'testing'].sort((a, b) => 'standardized "high stakes" a testing'.indexOf(a) - 'standardized "high stakes" a testing'.indexOf(b)))
})

test('every term must match', () => {
  assert.equal(score('Testing pressure changed instruction', ['testing', 'grouping']), 0)
  assert.equal(score('testing, testing and more testing', ['testing']), 3)
})

test('snippets show page numbers', () => {
  const text = '--- Page 1 ---\nIntro text here.\n\n--- Page 2 ---\n' + 'x '.repeat(100) + 'Standardized testing shifted Luis toward worksheets.'
  const s = snippets(text, ['testing'])
  assert.equal(s.length, 1); assert.equal(s[0].page, 2); assert.match(s[0].text, /Standardized testing/)
})
