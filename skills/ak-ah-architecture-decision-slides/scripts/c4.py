import argparse
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from xml.etree import ElementTree as E


def plain(value, field, limit=120):
    if not isinstance(value, str) or not value.strip() or len(value) > limit or re.search(r'[<>\[\]{}!$#\\"\x00-\x1f]', value) or '://' in value:
        raise ValueError(f'{field} must be plain text, without directives, markup, URLs or line breaks')
    return value


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9_]{0,47}', value):
        raise ValueError('C4 identifiers must use lowercase letters, digits and underscores')
    return value


def make_source(model):
    if not isinstance(model, dict): raise ValueError('C4 model must be an object')
    title = plain(model.get('title'), 'title', 100)
    nodes, relationships = model.get('nodes'), model.get('relationships')
    if not isinstance(nodes, list) or not 1 <= len(nodes) <= 12: raise ValueError('C4 needs 1–12 nodes')
    if not isinstance(relationships, list) or len(relationships) > 24: raise ValueError('C4 accepts at most 24 relationships')
    lines = ['@startuml', '!include <C4/C4_Context>', 'LAYOUT_LEFT_RIGHT()', 'skinparam backgroundColor white', 'skinparam defaultFontName Arial', 'skinparam dpi 144', f'title {title}', 'UpdateElementStyle("system", $bgColor="#EAF8FE", $fontColor="#003B67", $borderColor="#00ADE6")', 'UpdateElementStyle("person", $bgColor="#003B67", $fontColor="#FFFFFF")']
    identifiers = set(); kinds = {'person': 'Person', 'system': 'System', 'external_system': 'System_Ext'}
    for node in nodes:
        if not isinstance(node, dict): raise ValueError('C4 node must be an object')
        name = identifier(node.get('id'))
        if name in identifiers: raise ValueError(f'Duplicate C4 node {name}')
        identifiers.add(name)
        kind = kinds.get(node.get('type'))
        if not kind: raise ValueError('C4 node type must be person, system or external_system')
        label = plain(node.get('title'), 'node.title', 70)
        description = plain(node.get('description', ' '), 'node.description')
        lines.append(f'{kind}({name}, "{label}", "{description}")')
    for relationship in relationships:
        if not isinstance(relationship, dict): raise ValueError('C4 relationship must be an object')
        source, target = relationship.get('from'), relationship.get('to')
        if source not in identifiers or target not in identifiers or source == target: raise ValueError('Unknown C4 relationship endpoint')
        label = plain(relationship.get('label'), 'relationship.label', 70)
        lines.append(f'Rel({source}, {target}, "{label}")')
    return '\n'.join(lines + ['SHOW_LEGEND()', '@enduml', ''])


def executable():
    return shutil.which(os.environ.get('PLANTUML_BIN') or 'plantuml')


def profile():
    return {**os.environ, 'PLANTUML_SECURITY_PROFILE': 'SANDBOX'}


def version(binary):
    result = subprocess.run([binary, '-version'], env=profile(), capture_output=True, timeout=15)
    output = (result.stdout + result.stderr).decode(errors='replace')
    match = re.search(r'PlantUML version (\d+)\.(\d+)\.(\d+)', output)
    if result.returncode or not match or tuple(map(int, match.groups())) < (1, 2021, 0):
        raise ValueError('PlantUML 1.2021.0 or newer with local C4/SANDBOX support is required')
    return match.group(0)


def validate_svg(raw):
    if len(raw) > 20000000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper(): raise ValueError('Unexpected SVG declarations or size')
    root = E.fromstring(raw)
    if root.tag.split('}')[-1] != 'svg': raise ValueError('Renderer did not produce SVG')
    if b'Syntax Error' in raw or b'Cannot include' in raw: raise ValueError('C4 standard library did not render successfully')
    for node in root.iter():
        if node.tag.split('}')[-1].lower() in ['script', 'foreignobject']: raise ValueError('Active SVG content is not allowed')
        for key, value in node.attrib.items():
            local = key.split('}')[-1].lower()
            if local.startswith('on'): raise ValueError('Active SVG references are not allowed')
            if local in ['href', 'src'] and not value.startswith('#'):
                inline = re.fullmatch(r'data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)', value)
                if node.tag.split('}')[-1] != 'image' or not inline or len(value) > 12000000: raise ValueError('External SVG references are not allowed')
                image = base64.b64decode(inline[2], validate=True)
                signature = b'\x89PNG\r\n\x1a\n' if inline[1] == 'png' else b'\xff\xd8\xff'
                if not image.startswith(signature): raise ValueError('Invalid inline SVG image')
        content = ' '.join(node.attrib.values()) + (node.text or '')
        for url in re.findall(r'url\(([^)]+)\)', content, re.I):
            if not url.strip(' \t\"\'').startswith('#'): raise ValueError('External SVG URLs are not allowed')


def render_bytes(binary, source, format_name):
    result = subprocess.run([binary, '-nometadata', f'-t{format_name}', '-pipe'], input=source.encode(), env=profile(), capture_output=True, timeout=45)
    if result.returncode: raise ValueError(f'Local PlantUML failed: {result.stderr.decode(errors="replace")[:500]}')
    if format_name == 'svg': validate_svg(result.stdout)
    elif not result.stdout.startswith(b'\x89PNG\r\n\x1a\n'): raise ValueError('Renderer did not produce PNG')
    return result.stdout


def smoke_source():
    return make_source({'title': 'Local C4 check', 'nodes': [{'id': 'reader', 'type': 'person', 'title': 'Reader', 'description': 'Asks for information'}, {'id': 'service', 'type': 'system', 'title': 'Example service', 'description': 'Returns information'}], 'relationships': [{'from': 'reader', 'to': 'service', 'label': 'Requests information'}]})


def render(model_path, output):
    if output.exists() or output.is_symlink(): raise ValueError(f'Output directory already exists: {output}')
    source = make_source(json.loads(model_path.read_text(encoding='utf-8')))
    output.mkdir(parents=True)
    (output / 'context.puml').write_text(source, encoding='utf-8')
    binary = executable()
    status = {'state': 'missing', 'rendered': False, 'installsPerformed': False, 'source': 'context.puml', 'action': 'Propose a trusted, versioned local tool installation and obtain approval before installing.'}
    code = 2
    if binary:
        try:
            tool_version = version(binary)
            svg = render_bytes(binary, source, 'svg')
            png = render_bytes(binary, source, 'png')
            (output / 'context.svg').write_bytes(svg); (output / 'context.png').write_bytes(png)
            status = {'state': 'ready', 'rendered': True, 'version': tool_version, 'securityProfile': 'SANDBOX', 'installsPerformed': False}
            code = 0
        except (ValueError, OSError, subprocess.SubprocessError, E.ParseError) as error:
            status.update(state='broken', error=str(error)); code = 1
    (output / 'status.json').write_text(json.dumps(status, indent=2) + '\n')
    return status, code


def main():
    parser = argparse.ArgumentParser(description='Generate bounded C4 context source and render locally. No automatic installation or remote rendering.')
    parser.add_argument('model', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        status, code = render(args.model, args.output); print(json.dumps(status, indent=2)); return code
    except (ValueError, OSError, TypeError) as error:
        print(str(error), file=sys.stderr); return 1


if __name__ == '__main__':
    sys.exit(main())
