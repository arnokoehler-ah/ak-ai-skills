import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import pixelWidth from 'string-pixel-width';
import { assertTextFits } from './text-fit.mjs';
import { route, labelBounds } from './geometry.mjs';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const theme = JSON.parse(await readFile(path.join(assets, 'theme.json'), 'utf8'));

export async function renderSlide(pptx, slide, item, deck, index, inputDirectory) {
  let part = 0;
  const name = group => `${group}::${++part}`;
  function text(value, x, y, w, h, options = {}, group = 'static') {
    if (!value) return;
    assertTextFits(value, { w, h, fontSize: 18, ...options });
    if (x < 0 || y < 0 || x + w > 13.334 || y + h > 7.5) throw new Error(`Text outside slide: ${value}`);
    slide.addText(value, { x, y, w, h, margin: 0, valign: 'mid', fontFace: 'Arial', fontSize: 18, color: theme.navy, ...options, objectName: name(group) });
  }
  function rect(x, y, w, h, color, group = 'static', stroke = color) {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color }, line: { color: stroke, width: .8 }, objectName: name(group) });
  }
  function line(a, b, color, group, arrow = false) {
    const reverse = b[0] < a[0] || (b[0] === a[0] && b[1] < a[1]);
    const flipV = (b[0] - a[0]) * (b[1] - a[1]) < 0;
    slide.addShape(pptx.ShapeType.line, { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]), flipV, line: { color, width: 1.8, beginArrowType: arrow && reverse ? 'triangle' : 'none', endArrowType: arrow && !reverse ? 'triangle' : 'none' }, objectName: name(group) });
  }
  slide.background = { color: 'FFFFFF' };
  slide.addImage({ path: path.join(assets, 'ah-logo.png'), x: .7, y: .32, w: .54, h: .54, altText: 'Albert Heijn' });
  text(item.kicker || deck.title, 1.47, .50, 9.1, .25, { fontSize: 10, bold: true, charSpacing: 1 });
  text(item.basis.toUpperCase(), 10.8, .50, 1.84, .25, { fontSize: 10, color: theme.muted, align: 'right' });
  text(item.title, .7, 1.17, 11.94, 1.2, { fontSize: 32, bold: true, valign: 'top' });
  if (item.takeaway) {
    rect(.7, 6.3, 11.94, .57, theme.navy, 'takeaway');
    text(item.takeaway, .94, 6.44, 11.46, .31, { fontSize: 16, bold: true, color: 'FFFFFF' }, 'takeaway');
  }
  text(`${deck.audience.toUpperCase()} · ${deck.language === 'nl' ? 'ARCHITECTUURBESLUIT' : 'ARCHITECTURE DECISION'}`, .7, 7.1, 10.9, .18, { fontSize: 9, color: theme.muted });
  text(String(index + 1).padStart(2, '0'), 12.15, 7.08, .49, .22, { fontSize: 10, color: theme.muted, align: 'right' });
  if (item.layout === 'columns' || item.layout === 'options') {
    const columns = item.columns || item.options;
    const gap = .36; const w = (11.94 - gap * (columns.length - 1)) / columns.length;
    columns.forEach((column, i) => {
      const x = .7 + i * (w + gap); const group = `${item.layout === 'options' ? 'option' : 'column'}-${i + 1}`;
      rect(x, 2.88, w, 2.94, column.preferred ? theme.pale : 'F3F6F8', group);
      rect(x, 2.88, w, .04, column.preferred ? theme.blue : 'BED7E4', group);
      const label = item.layout === 'options' ? (column.baseline ? 'BASELINE' : column.preferred ? (deck.language === 'nl' ? 'VOORKEUR' : 'PREFERRED') : (deck.language === 'nl' ? 'ALTERNATIEF' : 'ALTERNATIVE')) : column.label || String(i + 1).padStart(2, '0');
      text(label, x + .22, 3.12, w - .44, .24, { fontSize: 10.5, color: '007DA8', bold: true }, group);
      text(column.title, x + .22, 3.55, w - .44, .78, { fontSize: 22, bold: true, valign: 'top' }, group);
      if (item.layout === 'options') {
        text(column.benefit, x + .22, 4.36, w - .44, .59, { fontSize: 16.5, valign: 'top' }, group);
        text(column.tradeoff, x + .22, 5.06, w - .44, .59, { fontSize: 16.5, color: theme.muted, valign: 'top' }, group);
      } else text(column.body, x + .22, 4.36, w - .44, 1.29, { fontSize: 17, color: theme.muted, valign: 'top' }, group);
    });
  } else if (item.layout === 'before_after') {
    text(deck.language === 'nl' ? 'VANDAAG' : 'TODAY', 2.16, 2.8, 4.2, .25, { fontSize: 11, bold: true, color: theme.muted });
    text(deck.language === 'nl' ? 'VOORGESTELDE RICHTING' : 'PROPOSED DIRECTION', 7.0, 2.8, 5.64, .25, { fontSize: 11, bold: true, color: '007DA8' });
    item.rows.forEach((row, i) => {
      const y = 3.25 + i * .92; const group = `row-${i + 1}`;
      text(row.label, .7, y + .24, 1.32, .28, { fontSize: 11, bold: true }, group);
      rect(2.16, y, 4.16, .78, 'F3F6F8', group); rect(7, y, 5.64, .78, theme.pale, group);
      text(row.before, 2.38, y + .08, 3.72, .63, { fontSize: 17 }, group);
      text('→', 6.47, y + .19, .38, .41, { fontSize: 22, color: theme.blue }, group);
      text(row.after, 7.22, y + .08, 5.2, .63, { fontSize: 17 }, group);
    });
  } else if (item.layout === 'interaction') {
    const model = deck.models[item.model];
    const byId = new Map(model.nodes.map(node => [node.id, node]));
    const active = new Set(item.focus || model.nodes.map(n => n.id).concat(model.edges.map(e => e.id)));
    const labels = [];
    model.edges.filter(e => active.has(e.id)).forEach(e => { active.add(e.from); active.add(e.to); });
    for (const edge of model.edges) {
      const modelPoints = route(edge, byId);
      const points = modelPoints.map(([x, y]) => [x + .7, y + 2.8]);
      const color = active.has(edge.id) ? (edge.kind === 'response' ? theme.navy : theme.blue) : 'CBD7DF';
      const group = `edge-${edge.id}`;
      for (let i = 1; i < points.length; i++) line(points[i - 1], points[i], color, group, i === points.length - 1);
      if (edge.label) {
        const width = Math.min(2.8, Math.max(.35, pixelWidth(edge.label, { font: 'arial', size: 12 }) / 72 / .90));
        const box = labelBounds(modelPoints, width, model.nodes, [...model.annotations, ...labels], item.table ? 1.85 : 3.1);
        labels.push(box);
        text(edge.label, box.x + .7, box.y + 2.8, box.w, box.h, { fontSize: 12, color, align: 'center' }, group);
      }
    }
    for (const node of model.nodes) {
      const x = node.x + .7; const y = node.y + 2.8; const group = `node-${node.id}`;
      const muted = node.context || !active.has(node.id);
      rect(x, y, node.w, node.h, muted ? 'F5F7F8' : theme.pale, group, muted ? 'D5DFE5' : theme.blue);
      text(node.title, x + .16, y + .15, node.w - .32, .36, { fontSize: node.titleSize, bold: true, color: muted ? '7D929F' : theme.navy }, group);
      text(node.detail, x + .16, y + node.h - .31, node.w - .32, .26, { fontSize: node.detailSize, color: theme.muted }, group);
    }
    for (const note of model.annotations) {
      const group = `note-${note.id}`; const x = note.x + .7; const y = note.y + 2.8;
      rect(x, y, note.w, note.h, note.tone === 'warning' ? 'FFF3D7' : 'F1F6F9', group);
      text(note.text, x + .12, y + .06, note.w - .24, note.h - .12, { fontSize: 14, color: note.tone === 'warning' ? '855800' : theme.muted }, group);
    }
    if (item.table) {
      const table = item.table; const w = 11.94 / table.columns.length;
      rect(.7, 5.03, 11.94, .28, theme.pale, 'table-frame');
      for (const i of table.emphasisRows) rect(.7, 5.43 + i * .25 - .025, 11.94, .25, 'FFF3D7', `table-highlight-${i}`);
      table.columns.forEach((column, i) => {
        const x = .86 + i * w; const group = `table-col-${column.key}`;
        text(column.title, x, 5.07, w - .3, .20, { fontSize: 10, bold: true, color: '007DA8' }, group);
        table.rows.forEach((row, j) => text(row[column.key], x, 5.43 + j * .25, w - .3, .22, { fontSize: 12 }, group));
      });
    }
  } else if (item.layout === 'image') {
    if (/^[a-z]+:\/\//i.test(item.image)) throw new Error('image must be local');
    const filename = path.resolve(inputDirectory, item.image);
    const image = sharp(filename, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['png', 'jpeg'].includes(metadata.format)) throw new Error('image must be PNG or JPEG');
    await image.stats();
    const scale = Math.min(11.94 / metadata.width, 3.12 / metadata.height);
    const w = metadata.width * scale; const h = metadata.height * scale;
    slide.addImage({ path: filename, x: .7 + (11.94 - w) / 2, y: 2.8 + (3.12 - h) / 2, w, h, objectName: name('diagram'), altText: item.title });
  }
  slide.addNotes(`Basis: ${item.basis}\n${item.notes || ''}\n\nSources:\n${(item.sources || []).join('\n')}`);
}
