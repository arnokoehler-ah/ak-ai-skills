import { buildDeck } from './deck.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/build.mjs INPUT.json OUTPUT.pptx [--force]\nImages resolve relative to INPUT.json. Inspect the actual PPTX with render-preview.py before delivery.');
} else if (args.length < 2 || args.length > 3 || (args.length === 3 && args[2] !== '--force')) {
  console.error('Usage: node scripts/build.mjs INPUT.json OUTPUT.pptx [--force]');
  process.exitCode = 1;
} else {
  try { console.log(JSON.stringify(await buildDeck(args[0], args[1], { force: args[2] === '--force' }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
