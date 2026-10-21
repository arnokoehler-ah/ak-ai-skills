import { readFile, writeFile, mkdir, lstat, mkdtemp, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import PptxGenJS from 'pptxgenjs';
import { validateDeck } from './validate.mjs';
import { renderSlide } from './layouts.mjs';

async function build(inputPath, outputPath) {
  const output = path.resolve(outputPath);
  try { await lstat(output); throw new Error(`Output directory already exists: ${output}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const data = validateDeck(JSON.parse(await readFile(inputPath, 'utf8')));
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; pptx.title = data.title; pptx.author = 'AH Architecture Decision Slides';
  pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial', lang: data.language === 'nl' ? 'nl-NL' : 'en-GB' };
  for (const [i, item] of data.slides.entries()) await renderSlide(pptx, pptx.addSlide(), item, data, i, path.dirname(path.resolve(inputPath)));
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  const manifest = { schemaVersion: 1, sourceSha256: createHash('sha256').update(buffer).digest('hex'), duration: .35, slides: data.slides.map((s, i) => ({ index: i + 1, id: s.id, title: s.title, steps: s.steps || [] })) };
  const cues = data.slides.map((s, i) => `## ${i + 1}. ${s.title.replaceAll('\n', ' ')}\n\n${s.steps ? s.steps.map((step, j) => `${j + 1}. ${step.cue}`).join('\n') : 'Static slide.'}`).join('\n\n');
  await mkdir(path.dirname(output), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(output), '.architecture-'));
  try {
    await writeFile(path.join(staging, 'presentation.pptx'), buffer);
    await writeFile(path.join(staging, 'animation-plan.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(path.join(staging, 'click-script.md'), `# ${data.title}\n\n${cues}\n`);
    await writeFile(path.join(staging, 'verification.json'), JSON.stringify({ slides: data.slides.length, nativeEditable: true, visualReview: 'pending' }, null, 2) + '\n');
    await rename(staging, output);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return { output, slides: data.slides.length, visualReview: 'pending' };
}

const args = process.argv.slice(2);
if (args.includes('--help')) console.log('Usage: node scripts/build.mjs INPUT.json NEW_OUTPUT_DIRECTORY\nBuilds native PowerPoint plus a semantic animation plan and click script. Never installs dependencies.');
else if (args.length !== 2) { console.error('Usage: node scripts/build.mjs INPUT.json NEW_OUTPUT_DIRECTORY'); process.exitCode = 1; }
else { try { console.log(JSON.stringify(await build(args[0], args[1]), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
