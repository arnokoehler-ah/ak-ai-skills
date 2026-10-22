import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as E
from zipfile import ZipFile, ZIP_DEFLATED, BadZipFile


NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
for prefix, uri in NS.items():
    E.register_namespace(prefix, uri)
TEMPLATES = Path(__file__).resolve().parents[1] / 'assets/animations'
EFFECTS = {'fly-left', 'fly-right', 'fade', 'wipe-left', 'wipe-right'}


def el(tag, attributes=None):
    prefix, name = tag.split(':')
    return E.Element(f'{{{NS[prefix]}}}{name}', attributes or {})


def identity(shape):
    props = shape.find('.//p:cNvPr', NS)
    return props.attrib if props is not None else {}


def group_shapes(shapes, group_id, target):
    boxes = []
    for shape in shapes:
        transform = shape.find('p:spPr/a:xfrm', NS)
        if transform is None:
            raise ValueError(f'Unsupported transform in target {target}')
        offset, extent = transform.find('a:off', NS), transform.find('a:ext', NS)
        boxes.append(tuple(int(v) for v in (offset.attrib['x'], offset.attrib['y'], extent.attrib['cx'], extent.attrib['cy'])))
    x, y = min(b[0] for b in boxes), min(b[1] for b in boxes)
    w, h = max(b[0] + b[2] for b in boxes) - x, max(b[1] + b[3] for b in boxes) - y
    group = el('p:grpSp')
    props = el('p:nvGrpSpPr')
    props.extend([el('p:cNvPr', {'id': str(group_id), 'name': f'anim-{target}'}), el('p:cNvGrpSpPr'), el('p:nvPr')])
    group.append(props)
    layout = el('p:grpSpPr'); transform = el('a:xfrm')
    for tag, attributes in [('a:off', {'x': x, 'y': y}), ('a:ext', {'cx': w, 'cy': h}), ('a:chOff', {'x': x, 'y': y}), ('a:chExt', {'cx': w, 'cy': h})]:
        transform.append(el(tag, {key: str(value) for key, value in attributes.items()}))
    layout.append(transform); group.append(layout); group.extend(shapes)
    return group


def time_node(parent, attributes, delay=None):
    node = el('p:cTn', {'id': '0', **attributes}); parent.append(node)
    if delay is not None:
        conditions = el('p:stCondLst'); conditions.append(el('p:cond', {'delay': delay})); node.append(conditions)
    children = el('p:childTnLst'); node.append(children)
    return children


def timing_tree(steps, bindings, duration):
    timing = el('p:timing'); listing = el('p:tnLst'); timing.append(listing)
    root = el('p:par'); listing.append(root)
    children = time_node(root, {'dur': 'indefinite', 'restart': 'never', 'nodeType': 'tmRoot'})
    sequence = el('p:seq', {'concurrent': '1', 'nextAc': 'seek'}); children.append(sequence)
    main = time_node(sequence, {'dur': 'indefinite', 'nodeType': 'mainSeq'})
    for step in steps:
        click = el('p:par'); main.append(click)
        click_children = time_node(click, {'fill': 'hold'}, 'indefinite')
        parallel = el('p:par'); click_children.append(parallel)
        effects = time_node(parallel, {'fill': 'hold'}, '0')
        for index, item in enumerate(step['show']):
            template = E.fromstring((TEMPLATES / f'{item["effect"]}.xml').read_bytes())
            template.find('p:cTn', NS).set('nodeType', 'clickEffect' if index == 0 else 'withEffect')
            for target in template.findall('.//p:spTgt', NS):
                target.set('spid', str(bindings[item['target']]))
            for node in template.findall('.//p:cTn', NS):
                if node.attrib.get('dur', '').isdigit() and int(node.attrib['dur']) > 1:
                    node.set('dur', str(round(duration * 1000)))
            effects.append(template)
    for tag, event in [('p:prevCondLst', 'onPrev'), ('p:nextCondLst', 'onNext')]:
        conditions = el(tag); condition = el('p:cond', {'evt': event, 'delay': '0'})
        target = el('p:tgtEl'); target.append(el('p:sldTgt')); condition.append(target); conditions.append(condition); sequence.append(conditions)
    for index, node in enumerate(timing.findall('.//p:cTn', NS), 1):
        node.set('id', str(index))
    return timing


def prepare_slide(raw, configuration, duration):
    steps = configuration.get('steps', [])
    if not isinstance(steps, list) or len(steps) > 12:
        raise ValueError('steps must contain at most 12 click groups')
    slide = E.fromstring(raw)
    if slide.find('p:timing', NS) is not None:
        raise ValueError('Source already contains animation timing')
    if not steps:
        return raw, {'clicks': 0, 'effects': 0}
    tree = slide.find('p:cSld/p:spTree', NS)
    children = list(tree)
    available = {}
    for index, shape in enumerate(children):
        name = identity(shape).get('name', '')
        if '::' in name:
            available.setdefault(name.split('::', 1)[0], []).append(index)
    next_id = max(int(p.attrib['id']) for p in slide.findall('.//p:cNvPr', NS)) + 1
    bindings, consumed, groups = {}, set(), {}
    for step in steps:
        if not isinstance(step, dict) or not isinstance(step.get('cue'), str) or not step['cue'].strip() or not isinstance(step.get('show'), list) or not 1 <= len(step['show']) <= 40:
            raise ValueError('Each step needs a cue and 1–40 groups')
        for item in step['show']:
            target = item.get('target')
            if target not in available or target == 'static':
                raise ValueError(f'Unknown semantic target {target}')
            if target in bindings:
                raise ValueError(f'Entrance target {target} can appear only once')
            if item.get('effect') not in EFFECTS:
                raise ValueError(f'Unsupported effect {item.get("effect")}')
            indexes = available[target]
            bindings[target] = next_id
            groups[max(indexes)] = group_shapes([children[i] for i in indexes], next_id, target)
            consumed.update(indexes); next_id += 1
    before_text = Counter(t.text or '' for t in slide.findall('.//a:t', NS))
    for child in children:
        tree.remove(child)
    for index, child in enumerate(children):
        if index not in consumed: tree.append(child)
        if index in groups: tree.append(groups[index])
    timing = timing_tree(steps, bindings, duration)
    extension = slide.find('p:extLst', NS)
    slide.insert(list(slide).index(extension) if extension is not None else len(slide), timing)
    if before_text != Counter(t.text or '' for t in slide.findall('.//a:t', NS)):
        raise ValueError('Animation grouping changed authored text')
    return E.tostring(slide, encoding='utf-8', xml_declaration=True), {'clicks': len(steps), 'effects': len(bindings)}


def animate(source, plan_file, output, show=None):
    outputs = [output, output.with_suffix('.verification.json')] + ([show] if show else [])
    resolved = [p.resolve() for p in outputs]
    if len(set(resolved)) != len(resolved) or any(p in [source.resolve(), plan_file.resolve()] for p in resolved):
        raise ValueError('Output paths must be distinct from each other and inputs')
    for filename in outputs:
        if filename.exists() or filename.is_symlink(): raise ValueError(f'Output already exists: {filename}')
    if output.suffix.lower() != '.pptx' or show and show.suffix.lower() != '.ppsx': raise ValueError('Use .pptx and .ppsx output extensions')
    plan = json.loads(plan_file.read_text(encoding='utf-8'))
    contents = source.read_bytes()
    if plan.get('schemaVersion') != 1 or hashlib.sha256(contents).hexdigest() != plan.get('sourceSha256'):
        raise ValueError('Manifest schema or source hash mismatch')
    duration = plan.get('duration', .35)
    if type(duration) not in (int, float) or not math.isfinite(duration) or not .1 <= duration <= 2:
        raise ValueError('Animation duration must be between 0.1 and 2 seconds')
    report = []; result = io.BytesIO()
    with ZipFile(io.BytesIO(contents)) as original, ZipFile(result, 'w', ZIP_DEFLATED) as target:
        presentation = E.fromstring(original.read('ppt/presentation.xml'))
        count = len(presentation.findall('p:sldIdLst/p:sldId', NS))
        if not isinstance(plan.get('slides'), list) or len(plan['slides']) != count: raise ValueError('Manifest slide count mismatch')
        for i, config in enumerate(plan['slides'], 1):
            if config.get('index') != i: raise ValueError('Manifest slide index mismatch')
        for entry in original.infolist():
            raw = original.read(entry.filename)
            match = re.fullmatch(r'ppt/slides/slide(\d+)\.xml', entry.filename)
            if match:
                index = int(match.group(1))
                if not 1 <= index <= count: raise ValueError('Unexpected source slide part')
                raw, status = prepare_slide(raw, plan['slides'][index - 1], duration)
                report.append({'slide': index, **status})
            target.writestr(entry, raw)
    pptx_bytes = result.getvalue()
    payloads = [(output, pptx_bytes)]
    if show:
        buffer = io.BytesIO()
        with ZipFile(io.BytesIO(pptx_bytes)) as original, ZipFile(buffer, 'w', ZIP_DEFLATED) as target:
            for entry in original.infolist():
                raw = original.read(entry.filename)
                if entry.filename == '[Content_Types].xml':
                    raw = raw.replace(b'presentationml.presentation.main+xml', b'presentationml.slideshow.main+xml')
                target.writestr(entry, raw)
        payloads.append((show, buffer.getvalue()))
    verification = {'slides': sorted(report, key=lambda r: r['slide']), 'durationSeconds': duration, 'nativeAnimations': True, 'playbackReview': 'pending'}
    payloads.append((output.with_suffix('.verification.json'), (json.dumps(verification, indent=2) + '\n').encode()))
    created = []
    try:
        for filename, payload in payloads:
            filename.parent.mkdir(parents=True, exist_ok=True)
            with filename.open('xb') as target:
                created.append(filename); target.write(payload)
    except OSError:
        for filename in created: filename.unlink(missing_ok=True)
        raise
    return verification


def main():
    parser = argparse.ArgumentParser(description='Compose native grouped entrance animations without requiring Office. Existing outputs are preserved.')
    parser.add_argument('source', type=Path); parser.add_argument('plan', type=Path); parser.add_argument('output', type=Path); parser.add_argument('--show', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(animate(args.source, args.plan, args.output, args.show), indent=2))
    except (ValueError, KeyError, TypeError, OSError, E.ParseError, BadZipFile) as error:
        print(str(error), file=sys.stderr); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
