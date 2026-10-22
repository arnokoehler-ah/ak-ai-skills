import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const python = spawnSync('python3', ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).stdout.trim();
const model = () => ({ title: 'Voorbeeldcontext', nodes: [{ id: 'customer', type: 'person', title: 'Klant', description: 'Vraagt status' }, { id: 'service', type: 'system', title: 'Statusdienst', description: 'Geeft status' }], relationships: [{ from: 'customer', to: 'service', label: 'Vraagt status' }] });

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'architecture-tools-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = path.join(directory, 'bin'); await mkdir(bin);
  const marker = path.join(directory, 'unexpected-install');
  for (const name of ['brew', 'npm', 'sudo', 'curl', 'apt-get']) await writeFile(path.join(bin, name), `#!/bin/sh\nprintf invoked > '${marker}'\n`, { mode: 0o755 });
  return { directory, marker, bin, env: { ...process.env, PATH: bin, NODE_BIN: '', PLANTUML_BIN: '' } };
}

test('doctor reports missing tools without running an installer', async t => {
  const f = await fixture(t);
  const result = spawnSync(python, [path.join(root, 'scripts/doctor.py')], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.plantuml.state, 'missing'); assert.equal(report.node.state, 'missing');
  assert.equal(report.installsPerformed, false); await assert.rejects(access(f.marker));
});

test('missing PlantUML leaves usable source and honest status without claiming a render', async t => {
  const f = await fixture(t); const input = path.join(f.directory, 'context.json'); const output = path.join(f.directory, 'out');
  await writeFile(input, JSON.stringify(model()));
  const result = spawnSync(python, [path.join(root, 'scripts/c4.py'), input, output], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(await readFile(path.join(output, 'context.puml'), 'utf8'), /!include <C4\/C4_Context>/);
  assert.equal(JSON.parse(await readFile(path.join(output, 'status.json'), 'utf8')).state, 'missing');
  await assert.rejects(access(path.join(output, 'context.png'))); await assert.rejects(access(f.marker));
});

for (const label of ['<img:https://example.com/a.png>', 'Hello\n!includeurl https://example.com/a', '[[https://example.com external]]', 'name" )\n!include /etc/passwd']) {
  test(`rejects executable or rich-text diagram label ${JSON.stringify(label)}`, async t => {
    const f = await fixture(t); const input = path.join(f.directory, 'context.json'); const output = path.join(f.directory, 'out');
    const data = model(); data.nodes[1].title = label; await writeFile(input, JSON.stringify(data));
    const result = spawnSync(python, [path.join(root, 'scripts/c4.py'), input, output], { env: f.env, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /plain text/);
    await assert.rejects(access(output)); await assert.rejects(access(f.marker));
  });
}

test('rejects renderer output with external SVG references under sandbox mode', async t => {
  const f = await fixture(t); const input = path.join(f.directory, 'context.json'); const output = path.join(f.directory, 'out');
  await writeFile(input, JSON.stringify(model()));
  const executable = path.join(f.bin, 'plantuml');
  await writeFile(executable, `#!${python}\nimport os,sys\nif '-version' in sys.argv: print('PlantUML version 1.2025.10')\nelse:\n assert os.environ.get('PLANTUML_SECURITY_PROFILE') == 'SANDBOX'\n sys.stdin.read()\n print('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/private.png"/></svg>')\n`, { mode: 0o755 });
  const result = spawnSync(python, [path.join(root, 'scripts/c4.py'), input, output], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(await readFile(path.join(output, 'status.json'), 'utf8')).state, 'broken');
  await assert.rejects(access(path.join(output, 'context.svg')));
});

test('accepts self-contained PNG sprites emitted by the local C4 library', async () => {
  const png = (await readFile(path.join(root, 'assets/ah-logo.png'))).toString('base64');
  const script = `import sys\nsys.path.insert(0, ${JSON.stringify(path.join(root, 'scripts'))})\nfrom c4 import validate_svg\nvalidate_svg(b'<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${png}"/></svg>')\n`;
  const result = spawnSync(python, ['-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('doctor distinguishes an installed but unloadable native dependency from readiness', async t => {
  const f = await fixture(t); const skill = path.join(f.directory, 'isolated-skill');
  await mkdir(path.join(skill, 'scripts'), { recursive: true });
  for (const file of ['doctor.py', 'c4.py']) await writeFile(path.join(skill, 'scripts', file), await readFile(path.join(root, 'scripts', file)));
  for (const name of ['pptxgenjs', 'sharp', 'string-pixel-width']) {
    const directory = path.join(skill, 'node_modules', name); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.js'), name === 'sharp' ? "throw new Error('Could not load the native runtime');" : 'module.exports = {};');
  }
  const result = spawnSync(python, [path.join(skill, 'scripts/doctor.py')], { env: { ...f.env, NODE_BIN: process.execPath }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.dependencies.state, 'broken'); assert.match(report.dependencies.error, /native runtime/);
});
