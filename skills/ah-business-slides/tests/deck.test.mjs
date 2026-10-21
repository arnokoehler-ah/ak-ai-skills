import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = path.join(root, 'scripts/build.mjs');
const sample = () => ({
  title: 'Pilot & leren', language: 'nl', footer: 'Voorbeeld',
  slides: [
    { layout: 'cover', title: 'Samen klaar\nvoor de volgende stap.', subtitle: 'Een voorstel', steps: ['Richting', 'Actie', 'Resultaat'], notes: 'Start is nog niet besloten.' },
    { layout: 'bullets', title: 'Een compacte pilot', bullets: ['Zes weken', 'Twee teams', 'Start nog te bepalen'] },
    { layout: 'columns', title: 'Samen aan de slag', columns: [{ title: 'Richting', body: 'Maak het doel concreet.' }, { title: 'Actie', body: 'Spreek een eerste stap af.' }], decision: 'Stel de startdatum vast.' },
    { layout: 'metrics', title: 'De opzet', metrics: [{ value: '6', label: 'weken' }, { value: '2', label: 'teams' }] },
    { layout: 'chart', title: 'Fictieve voorbeelddata', chart: { type: 'bar', labels: ['A', 'B'], series: [{ name: 'Voorbeeld', values: [3, 5] }] }, sources: ['Fictieve data voor de technische test'] },
    { layout: 'closing', title: 'Samen vooruit.', subtitle: 'Besluit: wanneer starten we?' }
  ]
});

async function fixture(t, deck = sample()) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ah-slides-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'input.json');
  const output = path.join(directory, 'result.pptx');
  await writeFile(input, JSON.stringify(deck));
  return { directory, input, output };
}

function build(input, output, ...flags) {
  return spawnSync(process.execPath, [cli, input, output, ...flags], { cwd: tmpdir(), encoding: 'utf8' });
}

test('produces editable widescreen text, native chart data and speaker notes from every layout', async t => {
  const f = await fixture(t);
  const result = build(f.input, f.output);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(f.output));
  const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.equal(slides.length, 6);
  const cover = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(cover, /<a:t>Samen klaar/);
  const presentation = await zip.file('ppt/presentation.xml').async('string');
  assert.match(presentation, /cx="12192000" cy="6858000"/);
  const chart = await zip.file('ppt/charts/chart1.xml').async('string');
  assert.match(chart, /<c:v>5<\/c:v>/);
  assert.ok(Object.keys(zip.files).some(name => name.endsWith('.xlsx')));
  const notes = await zip.file('ppt/notesSlides/notesSlide1.xml').async('string');
  assert.match(notes, /Start is nog niet besloten/);
});

test('resolves image paths relative to input rather than working directory', async t => {
  const deck = sample();
  deck.slides[0].image = 'scene.png';
  const f = await fixture(t, deck);
  await writeFile(path.join(f.directory, 'scene.png'), await readFile(path.join(root, 'assets/ah-logo.png')));
  const result = build(f.input, f.output);
  assert.equal(result.status, 0, result.stderr);
});

test('preserves an existing deck unless replacement is explicitly requested', async t => {
  const f = await fixture(t);
  await writeFile(f.output, 'existing user deck');
  const result = build(f.input, f.output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(f.output, 'utf8'), 'existing user deck');
  assert.equal(build(f.input, f.output, '--force').status, 0);
});

test('accepts long local image filenames without applying slide typography limits', async t => {
  const f = await fixture(t);
  const deck = sample();
  deck.slides[0].image = path.join(f.directory, 'a-long-but-valid-image-filename-for-the-presentation.png');
  await writeFile(deck.slides[0].image, await readFile(path.join(root, 'assets/ah-logo.png')));
  await writeFile(f.input, JSON.stringify(deck));
  const result = build(f.input, f.output);
  assert.equal(result.status, 0, result.stderr);
});

test('crops a square image proportionally into a portrait content frame', async t => {
  const deck = sample();
  const f = await fixture(t, deck);
  deck.slides[1].image = path.join(root, 'assets/ah-logo.png');
  await writeFile(f.input, JSON.stringify(deck));
  const result = build(f.input, f.output);
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(await readFile(f.output));
  const xml = await zip.file('ppt/slides/slide2.xml').async('string');
  const crop = xml.match(/<a:srcRect l="(\d+)" r="(\d+)" t="(\d+)" b="(\d+)"/);
  assert.ok(crop, 'Native crop must exist');
  assert.ok(Number(crop[1]) > 15000 && Number(crop[1]) < 17000, `Expected proportional horizontal crop, got ${crop[1]}`);
  assert.equal(crop[1], crop[2]);
  assert.equal(crop[3], '0');
});

test('rejects undecodable image content before writing a deck', async t => {
  const f = await fixture(t);
  const deck = sample();
  deck.slides[0].image = 'broken.png';
  await writeFile(path.join(f.directory, 'broken.png'), 'this is not an image');
  await writeFile(f.input, JSON.stringify(deck));
  const result = build(f.input, f.output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /image.*decode/);
  await assert.rejects(access(f.output));
});

for (const [name, mutate] of [
  ['cover title within the old character limit', d => { d.slides[0].title = 'Samen werken aan betere resultaten voor klanten en collega’s in alle winkels van Nederland'; }],
  ['column body within the old character limit', d => { d.slides[2].columns = Array.from({ length: 3 }, () => ({ title: 'Plan', body: 'Maak samen duidelijke afspraken over de volgende stappen en bepaal wie het resultaat deze maand gaat toetsen.' })); }],
  ['dense illustrated bullets', d => { d.slides[1].image = path.join(root, 'assets/ah-logo.png'); d.slides[1].bullets = Array(5).fill('Maak deze maand samen heldere afspraken over doelen en resultaten voor alle betrokken collega’s.'); }],
  ['oversized metric values', d => { d.slides[3].metrics = Array(3).fill({ value: '1234567890', label: 'Jaarlijkse omzet' }); }]
]) {
  test(`rejects ${name} using the actual text box capacity`, async t => {
    const deck = sample();
    mutate(deck);
    const f = await fixture(t, deck);
    const result = build(f.input, f.output);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not fit/);
    await assert.rejects(access(f.output));
  });
}

test('rejects an image on a layout that would silently discard it', async t => {
  const deck = sample();
  deck.slides[3].image = path.join(root, 'assets/ah-logo.png');
  const f = await fixture(t, deck);
  const result = build(f.input, f.output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /image.*layout/);
});

for (const [name, mutate, message] of [
  ['long title', d => { d.slides[0].title = 'Very long title '.repeat(30); }, /title.*90/],
  ['dense bullet list', d => { d.slides[1].bullets = Array(9).fill('Point'); }, /bullets.*5/],
  ['empty slides', d => { d.slides = []; }, /deck\.slides/],
  ['unknown layout', d => { d.slides[0].layout = 'magic'; }, /layout/],
  ['missing image', d => { d.slides[0].image = 'missing.png'; }, /image/],
  ['remote image', d => { d.slides[0].image = 'https://example.com/image.png'; }, /local/],
  ['mismatched chart data', d => { d.slides[4].chart.series[0].values = [1]; }, /values/],
  ['non-numeric chart data', d => { d.slides[4].chart.series[0].values = [1, null]; }, /finite/],
  ['empty chart label', d => { d.slides[4].chart.labels = ['A', '']; }, /labels/]
]) {
  test(`rejects ${name} before writing a deck`, async t => {
    const deck = sample();
    mutate(deck);
    const f = await fixture(t, deck);
    const result = build(f.input, f.output);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    await assert.rejects(access(f.output));
  });
}
