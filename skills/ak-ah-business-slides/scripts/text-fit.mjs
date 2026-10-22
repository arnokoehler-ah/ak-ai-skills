import pixelWidth from 'string-pixel-width';

export function assertTextFits(value, { w, h, fontSize = 22, bold = false }) {
  if (!value) return;
  const maximumWidth = w * 72 * .95;
  const measure = text => pixelWidth(text, { font: 'arial', size: fontSize, bold });
  let lines = 0;
  for (const paragraph of value.split('\n')) {
    let current = '';
    lines++;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (measure(word) > maximumWidth) throw new Error(`Text does not fit: "${value.slice(0,70)}"; shorten the word or split the slide`);
      const candidate = current ? `${current} ${word}` : word;
      if (current && measure(candidate) > maximumWidth) { lines++; current = word; }
      else current = candidate;
    }
  }
  if (lines * fontSize * 1.25 > h * 72) throw new Error(`Text does not fit ${w.toFixed(2)} × ${h.toFixed(2)} inch box: "${value.slice(0,70)}"; shorten or split the slide`);
}
