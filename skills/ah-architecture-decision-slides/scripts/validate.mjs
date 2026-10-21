import { route, crosses } from './geometry.mjs';

const effects = new Set(['fly-left', 'fly-right', 'fade', 'wipe-left', 'wipe-right']);

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`);
}

function text(value, field, limit, optional = false) {
  if (value === undefined && optional) return;
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`${field} must contain 1–${limit} characters`);
  xmlText(value, field);
}

function xmlText(value, field) {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (![9, 10, 13].includes(point) && !(point >= 32 && point <= 0xd7ff) && !(point >= 0xe000 && point <= 0xfffd) && !(point >= 0x10000 && point <= 0x10ffff)) throw new Error(`${field} contains invalid XML characters`);
  }
}

function optionalBoolean(value, field) {
  if (value !== undefined && typeof value !== 'boolean') throw new Error(`${field} must be a boolean`);
}

function array(value, field, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${field} requires ${min}–${max} items`);
}

function id(value, field) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_]{0,47}$/.test(value)) throw new Error(`${field} must be a lowercase identifier using letters, digits and underscores`);
}

function number(value, field, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${field} must be a number between ${min} and ${max}`);
}

function validateModel(model, name) {
  object(model, `model ${name}`);
  array(model.nodes, `${name}.nodes`, 2, 8);
  array(model.edges, `${name}.edges`, 0, 16);
  const nodes = new Map();
  for (const node of model.nodes) {
    object(node, `${name}.node`); id(node.id, 'node.id');
    if (nodes.has(node.id)) throw new Error(`Duplicate node ${node.id}`);
    text(node.title, `${node.id}.title`, 50); text(node.detail, `${node.id}.detail`, 80, true);
    optionalBoolean(node.context, `${node.id}.context`);
    node.w ??= 2.8; node.h ??= .9;
    node.titleSize ??= 17; node.detailSize ??= 11.8;
    number(node.titleSize, 'node.titleSize', 13, 20); number(node.detailSize, 'node.detailSize', 10, 14);
    number(node.x, `${node.id}.x`, 0, 11.9); number(node.y, `${node.id}.y`, 0, 3.1);
    number(node.w, `${node.id}.w`, 1.4, 5); number(node.h, `${node.id}.h`, .8, 1.5);
    if (node.x + node.w > 11.9 || node.y + node.h > 3.1) throw new Error(`Node ${node.id} is outside the diagram area`);
    for (const other of nodes.values()) {
      if (node.x < other.x + other.w && node.x + node.w > other.x && node.y < other.y + other.h && node.y + node.h > other.y) throw new Error(`Model nodes overlap: ${node.id} and ${other.id}`);
    }
    nodes.set(node.id, node);
  }
  const edgeIds = new Set();
  for (const edge of model.edges) {
    object(edge, `${name}.edge`); id(edge.id, 'edge.id');
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) throw new Error(`Invalid endpoint on edge ${edge.id}`);
    text(edge.label, `${edge.id}.label`, 50, true);
    if (edge.kind !== undefined && !['request', 'response'].includes(edge.kind)) throw new Error('edge.kind must be request or response');
    if (edge.via !== undefined) {
      array(edge.via, `${edge.id}.via`, 1, 4);
      for (const point of edge.via) {
        array(point, 'via point', 2, 2); number(point[0], 'via x', 0, 11.9); number(point[1], 'via y', 0, 3.1);
      }
    }
    const points = route(edge, nodes);
    for (let i = 1; i < points.length; i++) for (const node of nodes.values()) {
      if (![edge.from, edge.to].includes(node.id) && crosses(points[i - 1], points[i], node)) throw new Error(`Edge ${edge.id} crosses node ${node.id}; supply via points or move the node`);
    }
  }
  model.annotations ??= [];
  array(model.annotations, 'annotations', 0, 6);
  const noteIds = new Set();
  for (const note of model.annotations) {
    object(note, 'annotation'); id(note.id, 'annotation.id'); text(note.text, 'annotation.text', 140);
    if (noteIds.has(note.id)) throw new Error(`Duplicate annotation ${note.id}`);
    noteIds.add(note.id);
    for (const [key, max] of [['x', 11.9], ['y', 3.1], ['w', 11.9], ['h', 3.1]]) number(note[key], `annotation.${key}`, key === 'w' || key === 'h' ? .3 : 0, max);
    if (note.x + note.w > 11.9 || note.y + note.h > 3.1) throw new Error('Annotation is outside diagram area');
    if (note.tone !== undefined && !['info', 'warning'].includes(note.tone)) throw new Error('annotation.tone must be info or warning');
    for (const node of nodes.values()) if (note.x < node.x + node.w && note.x + note.w > node.x && note.y < node.y + node.h && note.y + note.h > node.y) throw new Error(`Annotation overlaps node ${node.id}`);
  }
}

export function validateDeck(input) {
  object(input, 'deck');
  const deck = structuredClone(input);
  text(deck.title, 'deck.title', 100);
  deck.language ??= 'nl'; deck.audience ??= 'mt'; deck.models ??= {};
  if (!['nl', 'en'].includes(deck.language)) throw new Error('language must be nl or en');
  if (!['mt', 'cto', 'c-level'].includes(deck.audience)) throw new Error('audience must be mt, cto or c-level');
  object(deck.models, 'models');
  for (const [name, model] of Object.entries(deck.models)) { id(name, 'model id'); validateModel(model, name); }
  array(deck.slides, 'slides', 1, 40);
  const slideIds = new Set();
  for (const slide of deck.slides) {
    object(slide, 'slide'); id(slide.id, 'slide.id');
    if (slideIds.has(slide.id)) throw new Error(`Duplicate slide id ${slide.id}`);
    slideIds.add(slide.id);
    if (!['columns', 'options', 'before_after', 'interaction', 'image'].includes(slide.layout)) throw new Error(`Unsupported layout ${slide.layout}`);
    text(slide.title, `${slide.id}.title`, 100); text(slide.kicker, `${slide.id}.kicker`, 60, true);
    text(slide.takeaway, `${slide.id}.takeaway`, 115, true);
    if (!['source', 'hypothesis', 'proposal', 'example'].includes(slide.basis)) throw new Error(`${slide.id}.basis must identify source, hypothesis, proposal or example`);
    if (slide.sources !== undefined) { array(slide.sources, 'sources', 0, 10); slide.sources.forEach(s => text(s, 'source', 2000)); }
    if (slide.basis === 'source' && !slide.sources?.length) throw new Error(`${slide.id}: source-evidence slides require sources`);
    if (slide.notes !== undefined && typeof slide.notes !== 'string') throw new Error('notes must be text');
    if (slide.notes !== undefined) xmlText(slide.notes, 'notes');
    let targets = new Set(slide.takeaway ? ['takeaway'] : []);
    if (slide.layout === 'columns') {
      array(slide.columns, 'columns', 2, 3);
      slide.columns.forEach((column, i) => {
        object(column, 'column'); text(column.title, 'column.title', 45); text(column.body, 'column.body', 170);
        text(column.label, 'column.label', 30, true); targets.add(`column-${i + 1}`);
      });
    }
    if (slide.layout === 'options') {
      array(slide.options, 'options', 2, 3);
      if (slide.options.filter(o => o.baseline === true).length !== 1) throw new Error('options must identify exactly one baseline');
      if (slide.options.filter(o => o.preferred === true).length > 1) throw new Error('options can identify at most one preferred option');
      slide.options.forEach((option, i) => {
        object(option, 'option'); text(option.title, 'option.title', 40); text(option.benefit, 'option.benefit', 100); text(option.tradeoff, 'option.tradeoff', 100);
        optionalBoolean(option.baseline, 'option.baseline'); optionalBoolean(option.preferred, 'option.preferred');
        targets.add(`option-${i + 1}`);
      });
    }
    if (slide.layout === 'before_after') {
      array(slide.rows, 'rows', 1, 3);
      slide.rows.forEach((row, i) => {
        object(row, 'row'); text(row.label, 'row.label', 20); text(row.before, 'row.before', 90); text(row.after, 'row.after', 90);
        targets.add(`row-${i + 1}`);
      });
    }
    if (slide.layout === 'interaction') {
      if (!Object.hasOwn(deck.models, slide.model)) throw new Error(`Unknown model ${slide.model}`);
      const model = deck.models[slide.model];
      model.nodes.forEach(n => targets.add(`node-${n.id}`));
      model.edges.forEach(e => targets.add(`edge-${e.id}`));
      model.annotations.forEach(n => targets.add(`note-${n.id}`));
      if (slide.focus !== undefined) {
        array(slide.focus, 'focus', 0, 16);
        for (const focus of slide.focus) if (!model.edges.some(e => e.id === focus) && !model.nodes.some(n => n.id === focus)) throw new Error(`Unknown focus target ${focus}`);
      }
      if (slide.table !== undefined) {
        const table = slide.table; object(table, 'table'); array(table.columns, 'table.columns', 2, 5); array(table.rows, 'table.rows', 1, 3);
        const keys = new Set();
        for (const column of table.columns) {
          id(column.key, 'table.column.key'); text(column.title, 'table.column.title', 28);
          if (keys.has(column.key)) throw new Error('Duplicate table column'); keys.add(column.key);
          targets.add(`table-col-${column.key}`);
        }
        for (const row of table.rows) for (const key of keys) {
          const value = row?.[key];
          if (typeof value === 'number' && Number.isFinite(value)) row[key] = String(value);
          else text(value, `table cell ${key}`, 40);
        }
        table.emphasisRows ??= []; array(table.emphasisRows, 'table.emphasisRows', 0, table.rows.length);
        for (const index of table.emphasisRows) { if (!Number.isInteger(index) || index < 0 || index >= table.rows.length) throw new Error('Invalid emphasis row'); targets.add(`table-highlight-${index}`); }
        targets.add('table-frame');
        if ([...model.nodes, ...model.annotations].some(box => box.y + box.h > 1.85)) throw new Error('Model exceeds 1.85 inch diagram height reserved above a table');
      }
    }
    if (slide.layout === 'image') { text(slide.image, 'image', 2048); targets.add('diagram'); }
    if (slide.steps !== undefined) {
      array(slide.steps, 'steps', 1, 12);
      const seen = new Set();
      for (const step of slide.steps) {
        text(step.cue, 'step.cue', 300); array(step.show, 'step.show', 1, 24);
        for (const group of step.show) {
          if (!targets.has(group.target)) throw new Error(`Unknown animation target ${group.target}`);
          if (seen.has(group.target)) throw new Error(`Entrance target ${group.target} may appear only once`);
          seen.add(group.target);
          if (!effects.has(group.effect)) throw new Error(`Unsupported effect ${group.effect}`);
        }
      }
    }
  }
  return deck;
}
