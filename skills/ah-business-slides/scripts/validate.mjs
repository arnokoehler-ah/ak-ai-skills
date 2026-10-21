import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

function record(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`);
}

function text(value, field, max, required = true) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${field} must contain 1–${max} characters; shorten or split the slide`);
  if (value.split('\n').length > 3 || value.split(/\s+/).some(word => word.length > 32)) throw new Error(`${field} has too many lines or an unbreakable word; rephrase it`);
}

function list(value, field, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${field} must contain ${min}–${max} items`);
}

function validateChart(chart, field) {
  record(chart, field);
  if (!['bar', 'line'].includes(chart.type)) throw new Error(`${field}.type must be bar or line`);
  list(chart.labels, `${field}.labels`, 1, 8);
  chart.labels.forEach((label, i) => text(label, `${field}.labels[${i}]`, 24));
  list(chart.series, `${field}.series`, 1, 3);
  chart.series.forEach((series, i) => {
    record(series, `${field}.series[${i}]`);
    text(series.name, `${field}.series[${i}].name`, 30);
    if (!Array.isArray(series.values) || series.values.length !== chart.labels.length) throw new Error(`${field}.series[${i}].values must match labels length`);
    if (!series.values.every(value => typeof value === 'number' && Number.isFinite(value))) throw new Error(`${field}.series[${i}].values must be finite numbers`);
  });
}

async function localImage(value, directory, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error(`${field} must name a local image`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[a-z]:[\\/]/i.test(value)) throw new Error(`${field} must be a local PNG or JPEG path`);
  const filename = path.resolve(directory, value);
  if (!/\.(png|jpe?g)$/i.test(filename)) throw new Error(`${field} must be a local PNG or JPEG path`);
  try {
    if (!(await stat(filename)).isFile()) throw new Error('not a file');
  } catch {
    throw new Error(`${field} does not name an existing image: ${value}`);
  }
  try {
    const image = sharp(filename, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await image.metadata();
    const expectedFormat = /\.png$/i.test(filename) ? 'png' : 'jpeg';
    if (metadata.format !== expectedFormat || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1) throw new Error('unsupported image');
    await image.stats();
    return { path: filename, width: metadata.width, height: metadata.height };
  } catch {
    throw new Error(`${field} cannot decode as a static PNG/JPEG image: ${value}`);
  }
}

export async function validateDeck(input, inputDirectory) {
  record(input, 'deck');
  const deck = structuredClone(input);
  text(deck.title, 'deck.title', 120);
  text(deck.footer, 'deck.footer', 70, false);
  if (deck.language !== undefined && !['nl', 'en'].includes(deck.language)) throw new Error('deck.language must be nl or en');
  list(deck.slides, 'deck.slides', 1, 60);
  for (const [i, slide] of deck.slides.entries()) {
    const field = `slides[${i}]`;
    record(slide, field);
    if (!['cover', 'bullets', 'columns', 'metrics', 'chart', 'closing'].includes(slide.layout)) throw new Error(`${field}.layout is unsupported`);
    text(slide.title, `${field}.title`, 90);
    text(slide.kicker, `${field}.kicker`, 48, false);
    text(slide.subtitle, `${field}.subtitle`, 120, false);
    text(slide.decision, `${field}.decision`, 100, false);
    if (slide.notes !== undefined && typeof slide.notes !== 'string') throw new Error(`${field}.notes must be text`);
    if (slide.sources !== undefined) {
      list(slide.sources, `${field}.sources`, 0, 10);
      if (!slide.sources.every(source => typeof source === 'string' && source.trim())) throw new Error(`${field}.sources must contain text`);
    }
    if (slide.steps !== undefined) {
      list(slide.steps, `${field}.steps`, 1, 3);
      slide.steps.forEach((step, j) => text(step, `${field}.steps[${j}]`, 18));
    }
    if (slide.layout === 'bullets') {
      list(slide.bullets, `${field}.bullets`, 1, 5);
      slide.bullets.forEach((bullet, j) => text(bullet, `${field}.bullets[${j}]`, 100));
    }
    if (slide.layout === 'columns') {
      list(slide.columns, `${field}.columns`, 2, 3);
      slide.columns.forEach((column, j) => {
        record(column, `${field}.columns[${j}]`);
        text(column.title, `${field}.columns[${j}].title`, 32);
        text(column.body, `${field}.columns[${j}].body`, 110);
      });
    }
    if (slide.layout === 'metrics') {
      list(slide.metrics, `${field}.metrics`, 1, 3);
      slide.metrics.forEach((metric, j) => {
        record(metric, `${field}.metrics[${j}]`);
        text(metric.value, `${field}.metrics[${j}].value`, 10);
        text(metric.label, `${field}.metrics[${j}].label`, 42);
      });
    }
    if (slide.layout === 'chart') validateChart(slide.chart, `${field}.chart`);
    if (slide.image !== undefined) {
      if (!['cover', 'closing', 'bullets', 'columns'].includes(slide.layout)) throw new Error(`${field}.image is not supported by this layout`);
      const image = await localImage(slide.image, inputDirectory, `${field}.image`);
      slide.image = image.path;
      slide.imageSize = { width: image.width, height: image.height };
    }
  }
  return deck;
}
