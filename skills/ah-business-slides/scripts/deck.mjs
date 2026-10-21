import pptxgen from 'pptxgenjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateDeck } from './validate.mjs';
import { assertTextFits } from './text-fit.mjs';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const width = 13.333333;
const height = 7.5;

function text(slide, value, x, y, w, h, theme, options = {}) {
  assertTextFits(value, { w, h, fontSize: 22, ...options });
  slide.addText(value, { x, y, w, h, fontFace: theme.fontFace, fontSize: 22, color: theme.navy, margin: 0, breakLine: false, valign: 'mid', ...options });
}

function rectangle(pptx, slide, x, y, w, h, color, options = {}) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, line: { color, transparency: 100 }, fill: { color }, ...options });
}

function photo(pptx, slide, item, x, y, w, h) {
  const sourceWidth = h * item.imageSize.width / item.imageSize.height;
  slide.addImage({ path: item.image, x, y, w: sourceWidth, h, sizing: { type: 'cover', w, h }, altText: 'Presentation illustration' });
}

function frame(pptx, slide, item, deck, theme, index, dark = false) {
  slide.addImage({ path: path.join(assets, 'ah-logo.png'), x: .67, y: .43, w: .68, h: .68, altText: 'Albert Heijn' });
  text(slide, item.kicker || deck.title, 1.55, .65, 10.1, .25, theme, { fontSize: 11, bold: true, color: dark ? 'D9F5FF' : theme.navy, charSpacing: 1.8 });
  text(slide, deck.footer || '', .72, 7.03, 10.9, .18, theme, { fontSize: 9, color: dark ? 'D8ECF5' : theme.muted, charSpacing: .5 });
  text(slide, String(index + 1).padStart(2, '0'), 12.1, 7.03, .45, .18, theme, { fontSize: 9, color: dark ? 'FFFFFF' : theme.muted, align: 'right' });
}

function cover(pptx, slide, item, deck, theme, index) {
  const illustrated = Boolean(item.image);
  if (illustrated) {
    photo(pptx, slide, item, 0, 0, width, height);
    rectangle(pptx, slide, 0, 0, 8.4, height, theme.navy, { fill: { color: theme.navy, transparency: 13 } });
    rectangle(pptx, slide, 8.4, 0, 1.1, height, theme.navy, { fill: { color: theme.navy, transparency: 68 } });
  } else {
    slide.addShape(pptx.ShapeType.roundRect, { x: 8.75, y: .65, w: 4.6, h: 6.2, rotate: 348, radius: .25, fill: { color: theme.pale }, line: { color: theme.pale } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 9.35, y: 1.05, w: 4.1, h: 5.45, rotate: 348, radius: .25, fill: { color: theme.blue }, line: { color: theme.blue } });
  }
  frame(pptx, slide, item, deck, theme, index, illustrated);
  const lines = item.title.split('\n');
  lines.forEach((line, i) => {
    const color = i === lines.length - 1 && lines.length > 1 ? (illustrated ? '85DFFF' : theme.blue) : (illustrated ? 'FFFFFF' : theme.navy);
    text(slide, line, .72, 2.05 + i * .78, 7.45, .77, theme, { fontSize: 44, bold: true, valign: 'top', color });
  });
  if (item.subtitle) text(slide, item.subtitle, .75, 5.05, 6.6, 1.0, theme, { fontSize: 22, color: illustrated ? 'E0F1F8' : theme.muted, valign: 'top' });
  if (!illustrated && item.steps) item.steps.forEach((step, i) => {
    const x = 9.0 - i * .34;
    const y = 2.25 + i * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.35, h: .88, radius: .08, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' } });
    text(slide, String(i + 1).padStart(2, '0'), x + .22, y + .31, .4, .24, theme, { fontSize: 12, color: theme.blue });
    text(slide, step, x + .78, y + .2, 2.3, .45, theme, { fontSize: 21, bold: true });
  });
}

function heading(slide, item, theme, areaWidth = 11.9) {
  text(slide, item.title, .72, 1.57, areaWidth, 1.2, theme, { fontSize: 34, bold: true, valign: 'top' });
}

function decision(pptx, slide, item, theme, areaWidth = 11.9) {
  if (!item.decision) return;
  rectangle(pptx, slide, .72, 6.05, areaWidth, .6, theme.navy);
  text(slide, item.decision, .95, 6.15, areaWidth - .46, .36, theme, { fontSize: 18, color: 'FFFFFF', bold: true });
}

function bullets(pptx, slide, item, theme, areaWidth) {
  const gap = Math.min(1, 3 / item.bullets.length);
  item.bullets.forEach((bullet, i) => {
    const y = 2.88 + i * gap;
    slide.addShape(pptx.ShapeType.ellipse, { x: .75, y: y + .08, w: .12, h: .12, fill: { color: theme.blue }, line: { color: theme.blue } });
    text(slide, bullet, 1.05, y, areaWidth - .35, gap - .1, theme, { fontSize: 22, valign: 'top' });
  });
}

function columns(pptx, slide, item, theme, areaWidth, illustrated) {
  if (illustrated) {
    item.columns.forEach((column, i) => {
      const y = 2.85 + i * 1.0;
      text(slide, `${i + 1}`, .76, y + .04, .3, .3, theme, { fontSize: 18, color: theme.blue, bold: true });
      text(slide, column.title, 1.25, y, areaWidth - .6, .42, theme, { fontSize: 23, bold: true });
      text(slide, column.body, 1.25, y + .43, areaWidth - .7, .54, theme, { fontSize: 18, color: theme.muted, valign: 'top' });
    });
    return;
  }
  const cellWidth = (areaWidth - .38 * (item.columns.length - 1)) / item.columns.length;
  item.columns.forEach((column, i) => {
    const x = .72 + i * (cellWidth + .38);
    rectangle(pptx, slide, x, 3.0, cellWidth, .035, theme.blue);
    text(slide, `0${i + 1}`, x, 3.24, cellWidth, .3, theme, { fontSize: 12, color: theme.blue, bold: true });
    text(slide, column.title, x, 3.84, cellWidth, .85, theme, { fontSize: 25, bold: true, valign: 'top' });
    text(slide, column.body, x, 4.76, cellWidth, 1.0, theme, { fontSize: 20, color: theme.muted, valign: 'top' });
  });
}

function metrics(pptx, slide, item, theme) {
  const cellWidth = (11.9 - .32 * (item.metrics.length - 1)) / item.metrics.length;
  item.metrics.forEach((metric, i) => {
    const x = .72 + i * (cellWidth + .32);
    rectangle(pptx, slide, x, 3.08, cellWidth, 2.25, theme.pale);
    text(slide, metric.value, x + .25, 3.39, cellWidth - .5, .85, theme, { fontSize: 48, bold: true, color: theme.blue });
    text(slide, metric.label, x + .25, 4.48, cellWidth - .5, .85, theme, { fontSize: 22 });
  });
}

function chart(pptx, slide, item, theme) {
  slide.addChart(pptx.ChartType[item.chart.type], item.chart.series.map(series => ({ name: series.name, labels: item.chart.labels, values: series.values })), {
    x: .7, y: 2.87, w: 11.8, h: 3.0, catAxisLabelFontFace: theme.fontFace, catAxisLabelFontSize: 15,
    valAxisLabelFontFace: theme.fontFace, valAxisLabelFontSize: 14, chartColors: item.chart.series.length === 1 ? [theme.blue] : [theme.blue, theme.navy, '68C9A5'],
    showLegend: item.chart.series.length > 1, legendPos: 'b', legendFontFace: theme.fontFace, legendFontSize: 14,
    showTitle: false, showValue: true, dataLabelFormatCode: 'General', dataLabelPosition: 'outEnd', dataLabelColor: theme.navy,
    showBorder: false, showCatName: false, showShadow: false, showMarker: true, markerSize: 6,
    valGridLine: { color: 'E3EDF2', width: .5 }, catAxisLineColor: 'D6E2E9', valAxisLineColor: 'FFFFFF',
    showLine: true, lineSize: 2, catAxisLabelColor: theme.muted,
    valAxisLabelColor: theme.muted, showLegendKey: false, showPercent: false,
    ...(item.chart.type === 'bar' ? { barDir: 'col', catName: false, gapSizePct: 90 } : {})
  });
}

export async function buildDeck(inputPath, outputPath, { force = false } = {}) {
  const destination = path.resolve(outputPath);
  if (path.extname(destination).toLowerCase() !== '.pptx') throw new Error('Output must end with .pptx');
  if (path.resolve(inputPath) === destination) throw new Error('Input and output must be different files');
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const deck = await validateDeck(input, path.dirname(path.resolve(inputPath)));
  const theme = JSON.parse(await readFile(path.join(assets, 'theme.json'), 'utf8'));
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'AH Presentation Skills';
  pptx.subject = 'Editable presentation';
  pptx.title = deck.title;
  pptx.company = 'Albert Heijn';
  pptx.lang = deck.language === 'en' ? 'en-GB' : 'nl-NL';
  pptx.theme = { headFontFace: theme.fontFace, bodyFontFace: theme.fontFace, lang: pptx.lang };
  for (const [index, item] of deck.slides.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    const illustratedContent = Boolean(item.image) && ['bullets', 'columns'].includes(item.layout);
    if (['cover', 'closing'].includes(item.layout)) cover(pptx, slide, item, deck, theme, index);
    else {
      if (illustratedContent) photo(pptx, slide, item, 8.2, 0, width - 8.2, height);
      const areaWidth = illustratedContent ? 6.85 : 11.9;
      frame(pptx, slide, item, deck, theme, index);
      heading(slide, item, theme, areaWidth);
      if (item.layout === 'bullets') bullets(pptx, slide, item, theme, areaWidth);
      if (item.layout === 'columns') columns(pptx, slide, item, theme, areaWidth, illustratedContent);
      if (item.layout === 'metrics') metrics(pptx, slide, item, theme);
      if (item.layout === 'chart') chart(pptx, slide, item, theme);
      decision(pptx, slide, item, theme, areaWidth);
    }
    const sources = item.sources?.length ? `\n\nSources:\n${item.sources.join('\n')}` : '';
    slide.addNotes(`${item.notes || ''}${sources}` || deck.title);
  }
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  await mkdir(path.dirname(destination), { recursive: true });
  try { await writeFile(destination, buffer, { flag: force ? 'w' : 'wx' }); }
  catch (error) { if (error.code === 'EEXIST') throw new Error(`Output already exists: ${destination}; use --force to replace it`); throw error; }
  return { output: destination, slides: deck.slides.length, theme: theme.name, nativeEditable: true, visuallyVerified: false };
}
