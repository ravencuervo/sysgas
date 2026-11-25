import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('/salud existe y responde ok', () => {
  const html = readFileSync(new URL('../public/salud/index.html', import.meta.url), 'utf8')
  assert.match(html, /ok/)
})
