export function route(edge, nodes) {
  const from = nodes.get(edge.from); const to = nodes.get(edge.to);
  const dx = to.x + to.w / 2 - from.x - from.w / 2;
  const dy = to.y + to.h / 2 - from.y - from.h / 2;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const start = horizontal ? [from.x + (dx >= 0 ? from.w : 0), from.y + from.h / 2] : [from.x + from.w / 2, from.y + (dy >= 0 ? from.h : 0)];
  const end = horizontal ? [to.x + (dx >= 0 ? 0 : to.w), to.y + to.h / 2] : [to.x + to.w / 2, to.y + (dy >= 0 ? 0 : to.h)];
  return [start, ...(edge.via || []), end];
}

export function crosses(a, b, node) {
  let low = 0; let high = 1;
  for (const [axis, minimum, maximum] of [[0, node.x + .02, node.x + node.w - .02], [1, node.y + .02, node.y + node.h - .02]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) { if (a[axis] <= minimum || a[axis] >= maximum) return false; }
    else {
      const bounds = [(minimum - a[axis]) / delta, (maximum - a[axis]) / delta].sort((x, y) => x - y);
      low = Math.max(low, bounds[0]); high = Math.min(high, bounds[1]);
    }
  }
  return low < high;
}

export function labelBounds(points, width, nodes, occupied, areaHeight) {
  const height = .3;
  const segments = points.slice(1).map((b, index) => ({ a: points[index], b })).sort((a, b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) - Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]));
  const candidates = [];
  for (const { a, b } of segments) {
    const x = (a[0] + b[0]) / 2; const y = (a[1] + b[1]) / 2;
    if (Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])) candidates.push([x + .16, y - height / 2], [x - width - .16, y - height / 2]);
    else candidates.push([x - width / 2, y - height - .08], [x - width / 2, y + .08]);
    candidates.push([x - width / 2, Math.min(...nodes.map(n => n.y)) - height - .08], [x - width / 2, Math.max(...nodes.map(n => n.y + n.h)) + .08]);
  }
  for (const candidate of candidates) {
    const box = { x: Math.max(0, Math.min(11.9 - width, candidate[0])), y: Math.max(0, Math.min(areaHeight - height, candidate[1])), w: width, h: height };
    if (![...nodes, ...occupied].some(other => box.x < other.x + other.w + .025 && box.x + box.w + .025 > other.x && box.y < other.y + other.h + .025 && box.y + box.h + .025 > other.y)) return box;
  }
  throw new Error('Edge label overlaps model content; shorten its label or adjust nodes/via points');
}
