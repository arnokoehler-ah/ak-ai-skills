import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, access, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = path.join(root, 'scripts/build.mjs');

function input() {
  return {
    title: 'Een gericht besluit', language: 'nl', audience: 'cto',
    models: { flow: { nodes: [
      { id: 'source', title: 'Verwerking', detail: 'Verwerkt een wijziging', x: .2, y: .8, w: 3, h: .9 },
      { id: 'status', title: 'Statusdienst', detail: 'Maakt status beschikbaar', x: 7.8, y: .8, w: 3, h: .9 }
    ], edges: [{ id: 'update', from: 'source', to: 'status', label: 'Statuswijziging', kind: 'request' }] } },
    slides: [
      { id: 'compare', layout: 'options', title: 'Vergelijk de opties.', basis: 'example', options: [
        { title: 'Niets doen', benefit: 'Geen migratie.', tradeoff: 'De vertraging blijft.', baseline: true },
        { title: 'Vaker batchen', benefit: 'Kleinere eerste stap.', tradeoff: 'Koppeling blijft.' },
        { title: 'Ontkoppelen', benefit: 'Eigen ritme.', tradeoff: 'Meer beheer nodig.' }
      ], takeaway: 'Meet de consequenties voordat je kiest.' },
      { id: 'flow', layout: 'interaction', title: 'Status volgt de wijziging.', basis: 'proposal', model: 'flow', takeaway: 'Toets de gewenste actualiteit.', steps: [
        { cue: 'De verantwoordelijkheden.', show: [{ target: 'node-source', effect: 'fly-left' }, { target: 'node-status', effect: 'fly-right' }] },
        { cue: 'De wijziging wordt gedeeld.', show: [{ target: 'edge-update', effect: 'wipe-left' }, { target: 'takeaway', effect: 'fade' }] }
      ] },
      { id: 'focus', layout: 'interaction', title: 'Dezelfde structuur, andere nadruk.', basis: 'proposal', model: 'flow', focus: ['update'] }
    ]
  };
}

async function fixture(t, deck = input()) {
  const directory = await mkdtemp(path.join(tmpdir(), 'architecture-slides-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'input.json');
  await writeFile(filename, JSON.stringify(deck));
  return { directory, filename, output: path.join(directory, 'output') };
}

function build(f) {
  return spawnSync(process.execPath, [cli, f.filename, f.output], { cwd: tmpdir(), encoding: 'utf8' });
}

test('builds native diagrams with identical geometry across views and semantic click targets', async t => {
  const f = await fixture(t);
  const result = build(f);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(path.join(f.output, 'presentation.pptx')));
  const first = await zip.file('ppt/slides/slide2.xml').async('string');
  const second = await zip.file('ppt/slides/slide3.xml').async('string');
  for (const xml of [first, second]) {
    assert.match(xml, /node-source::/);
    assert.match(xml, /edge-update::/);
    assert.match(xml, /<a:t>Verwerking<\/a:t>/);
  }
  const extract = xml => [...xml.matchAll(/<p:sp>.*?name="node-[^"]+".*?<a:xfrm>(.*?)<\/a:xfrm>.*?<\/p:sp>/g)].map(m => m[1]);
  assert.deepEqual(extract(first), extract(second));
  assert.ok(extract(first).length >= 2);
  const plan = JSON.parse(await readFile(path.join(f.output, 'animation-plan.json'), 'utf8'));
  assert.match(plan.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(plan.slides[1].steps.length, 2);
  assert.match(await readFile(path.join(f.output, 'click-script.md'), 'utf8'), /De wijziging wordt gedeeld/);
});

test('preserves an existing output directory and user data', async t => {
  const f = await fixture(t);
  await mkdir(f.output);
  await writeFile(path.join(f.output, 'keep.txt'), 'user work');
  const result = build(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(path.join(f.output, 'keep.txt'), 'utf8'), 'user work');
});

test('keeps diagonal arrows pointed from their declared source to target', async t => {
  const deck = input(); deck.models.flow.nodes[0].y = 1.8; deck.models.flow.nodes[1].y = .1;
  const f = await fixture(t, deck); const result = build(f);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(path.join(f.output, 'presentation.pptx')));
  const xml = await zip.file('ppt/slides/slide2.xml').async('string');
  assert.ok(/name="edge-update::[^"]+"[\s\S]*?<a:xfrm[^>]*flipV="1"/.test(xml), 'Rising diagonal must have its vertical transform flipped');
});

test('emits independently animatable table columns and explanatory callouts', async t => {
  const deck = input();
  deck.models.flow.nodes.forEach(node => { node.y = .1; });
  deck.models.flow.annotations = [{ id: 'meaning', text: 'De bron is een voorbeeld.', x: 3.7, y: 1.3, w: 4.1, h: .5 }];
  deck.slides[1].table = { columns: [{ key: 'period', title: 'Moment' }, { key: 'status', title: 'Status' }], rows: [{ period: 'Nu', status: 'Onbekend' }, { period: 'Na proef', status: 'Te meten' }], emphasisRows: [1] };
  deck.slides[1].steps[1].show.push({ target: 'note-meaning', effect: 'fade' }, { target: 'table-col-status', effect: 'fly-right' });
  const f = await fixture(t, deck); const result = build(f);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(path.join(f.output, 'presentation.pptx')));
  const xml = await zip.file('ppt/slides/slide2.xml').async('string');
  assert.match(xml, /table-col-status::/); assert.match(xml, /note-meaning::/); assert.match(xml, /Te meten/);
});

test('keeps vertical exchange labels outside the source and target cards', async t => {
  const deck = input();
  Object.assign(deck.models.flow.nodes[0], { x: 4, y: 0, w: 3, h: .9 });
  Object.assign(deck.models.flow.nodes[1], { x: 4, y: 2, w: 3, h: .9 });
  deck.models.flow.edges[0].label = 'Request';
  const f = await fixture(t, deck); const result = build(f);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(path.join(f.output, 'presentation.pptx')));
  const xml = await zip.file('ppt/slides/slide2.xml').async('string');
  const shape = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(m => m[0]).find(s => s.includes('edge-update::') && s.includes('<a:t>Request</a:t>'));
  assert.ok(shape);
  const offset = shape.match(/<a:off x="(\d+)" y="(\d+)"/); const extent = shape.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
  const [x, y, w, h] = [offset[1], offset[2], extent[1], extent[2]].map(Number).map(n => n / 914400);
  for (const box of [{ x: 4.7, y: 2.8, w: 3, h: .9 }, { x: 4.7, y: 4.8, w: 3, h: .9 }]) {
    assert.ok(!(x < box.x + box.w && x + w > box.x && y < box.y + box.h && y + h > box.y), 'Label must not be covered by a node card');
  }
});

for (const [name, change, message] of [
  ['unknown endpoint', d => { d.models.flow.edges[0].to = 'missing'; }, /endpoint/],
  ['overlapping model nodes', d => { d.models.flow.nodes[1].x = .3; }, /overlap/],
  ['missing model', d => { d.slides[1].model = 'missing'; }, /model/],
  ['missing baseline', d => { delete d.slides[0].options[0].baseline; }, /baseline/],
  ['uncited source claim', d => { d.slides[0].basis = 'source'; }, /sources/],
  ['unknown animation target', d => { d.slides[1].steps[0].show[0].target = 'missing'; }, /target/],
  ['repeated entrance', d => { d.slides[1].steps[1].show.push({ target: 'node-source', effect: 'fade' }); }, /once/],
  ['oversized title', d => { d.slides[0].title = 'Long text '.repeat(40); }, /title/],
  ['invalid XML in notes', d => { d.slides[0].notes = 'Pasted note\u000bnext line'; }, /XML/],
  ['string baseline flag', d => { d.slides[0].options[1].baseline = 'false'; }, /boolean/],
  ['string preferred flag', d => { d.slides[0].options[1].preferred = 'false'; }, /boolean/]
  ,['arrow crossing unrelated node', d => {
    d.models.flow.nodes[0].w = 2; d.models.flow.nodes[1].w = 2;
    d.models.flow.nodes.forEach(n => { delete n.detail; });
    d.models.flow.nodes.push({ id: 'middle', title: 'Ander', x: 4, y: .8, w: 2, h: .9 });
  }, /crosses/]
]) {
  test(`rejects ${name} before creating output`, async t => {
    const deck = input(); change(deck);
    const f = await fixture(t, deck);
    const result = build(f);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    await assert.rejects(access(f.output));
  });
}
