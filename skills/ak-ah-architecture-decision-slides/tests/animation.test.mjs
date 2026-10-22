import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('..', import.meta.url));

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'architecture-animation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'source.json');
  await writeFile(input, JSON.stringify({ title: 'Example', models: { flow: { nodes: [
    { id: 'one', title: 'One', x: 0, y: .8, w: 3, h: .9 }, { id: 'two', title: 'Two', x: 8, y: .8, w: 3, h: .9 }
  ], edges: [{ id: 'request', from: 'one', to: 'two', label: 'Request' }] } }, slides: [{
    id: 'interaction', title: 'One decision per click.', basis: 'example', layout: 'interaction', model: 'flow', takeaway: 'Test the assumption.', steps: [
      { cue: 'The components.', show: [{ target: 'node-one', effect: 'fly-left' }, { target: 'node-two', effect: 'fly-right' }] },
      { cue: 'The exchange.', show: [{ target: 'edge-request', effect: 'wipe-left' }] },
      { cue: 'The implication.', show: [{ target: 'takeaway', effect: 'fade' }] }
    ]
  }] }));
  const folder = path.join(directory, 'built');
  const built = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs'), input, folder], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  return { source: path.join(folder, 'presentation.pptx'), plan: path.join(folder, 'animation-plan.json'), output: path.join(directory, 'animated.pptx'), show: path.join(directory, 'animated.ppsx') };
}

function animate(f) {
  return spawnSync('python3', [path.join(root, 'scripts/animate.py'), f.source, f.plan, f.output, '--show', f.show], { encoding: 'utf8' });
}

test('writes native grouped fly-ins with three clicks and an editable slideshow package', async t => {
  const f = await fixture(t); const result = animate(f);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(f.output));
  const xml = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.equal((xml.match(/nodeType="clickEffect"/g) || []).length, 3);
  assert.equal((xml.match(/nodeType="withEffect"/g) || []).length, 1);
  assert.equal((xml.match(/presetID="2"/g) || []).length, 2);
  assert.ok(xml.includes('anim-node-one') && xml.includes('anim-node-two'));
  const ids = new Set([...xml.matchAll(/<p:cNvPr[^>]*id="(\d+)"/g)].map(m => m[1]));
  for (const target of xml.matchAll(/<p:spTgt[^>]*spid="(\d+)"/g)) assert.ok(ids.has(target[1]));
  const show = await JSZip.loadAsync(await readFile(f.show));
  assert.match(await show.file('[Content_Types].xml').async('string'), /presentationml.slideshow.main\+xml/);
  assert.ok(!Object.keys(zip.files).some(name => /vbaProject/i.test(name)));
});

for (const [name, change, message] of [
  ['wrong source hash', plan => { plan.sourceSha256 = '0'.repeat(64); }, /hash/],
  ['missing semantic target', plan => { plan.slides[0].steps[0].show[0].target = 'node-missing'; }, /target/],
  ['repeated entrance', plan => { plan.slides[0].steps[1].show.push({ target: 'node-one', effect: 'fade' }); }, /once/],
  ['unknown effect path', plan => { plan.slides[0].steps[0].show[0].effect = '../secret'; }, /effect/]
]) {
  test(`rejects ${name} without output`, async t => {
    const f = await fixture(t); const plan = JSON.parse(await readFile(f.plan, 'utf8')); change(plan); await writeFile(f.plan, JSON.stringify(plan));
    const result = animate(f); assert.equal(result.status, 1); assert.match(result.stderr, message);
    await assert.rejects(access(f.output)); await assert.rejects(access(f.show));
  });
}

test('preserves an existing show before writing the editable output', async t => {
  const f = await fixture(t); await writeFile(f.show, 'existing show');
  const result = animate(f); assert.equal(result.status, 1); assert.match(result.stderr, /exists/);
  assert.equal(await readFile(f.show, 'utf8'), 'existing show'); await assert.rejects(access(f.output));
});

test('package verification rejects corrupt notes instead of reporting valid structure', async t => {
  const f = await fixture(t);
  const zip = await JSZip.loadAsync(await readFile(f.source));
  const notes = await zip.file('ppt/notesSlides/notesSlide1.xml').async('string');
  zip.file('ppt/notesSlides/notesSlide1.xml', notes.replace('</a:t>', '\u000b</a:t>'));
  await writeFile(f.output, await zip.generateAsync({ type: 'nodebuffer' }));
  const result = spawnSync('python3', [path.join(root, 'scripts/verify.py'), f.output], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /notesSlide1.xml/);
});
