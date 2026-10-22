import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../scripts/render-preview.py', import.meta.url));

test('preview refuses an existing directory without changing its files', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preview-contract-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const marker = path.join(directory, 'keep.txt');
  await writeFile(marker, 'user work');
  const result = spawnSync('python3', [script, path.join(directory, 'input.pptx'), directory], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(marker, 'utf8'), 'user work');
});
