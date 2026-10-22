import argparse
import json
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as E
from zipfile import ZipFile, BadZipFile


NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}


def verify(filename):
    reports = []
    with ZipFile(filename) as archive:
        if archive.testzip() is not None: raise ValueError('ZIP integrity failed')
        if any('vbaProject' in name for name in archive.namelist()): raise ValueError('Unexpected macro payload')
        for name in archive.namelist():
            if name.endswith(('.xml', '.rels')):
                try: E.fromstring(archive.read(name))
                except E.ParseError as error: raise ValueError(f'{name}: invalid XML: {error}') from error
        for name in sorted(n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)):
            slide = E.fromstring(archive.read(name))
            ids = [p.attrib['id'] for p in slide.findall('.//p:cNvPr', NS)]
            if len(ids) != len(set(ids)): raise ValueError(f'{name}: duplicate shape IDs')
            for target in slide.findall('.//p:spTgt', NS):
                if target.attrib['spid'] not in ids: raise ValueError(f'{name}: missing animation target')
            timing = slide.findall('.//p:cTn', NS)
            tids = [t.attrib['id'] for t in timing]
            if len(tids) != len(set(tids)): raise ValueError(f'{name}: duplicate timing IDs')
            reports.append({'part': name, 'nativeTextRuns': len(slide.findall('.//a:t', NS)), 'clicks': sum(t.attrib.get('nodeType') == 'clickEffect' for t in timing), 'effects': sum(t.attrib.get('presetClass') == 'entr' for t in timing)})
    if not reports: raise ValueError('No slides found')
    return {'slides': reports, 'structure': 'valid', 'visualAndPlaybackReview': 'required separately'}


def main():
    parser = argparse.ArgumentParser(description='Inspect native PPTX structure, macro absence and animation targets; does not claim visual verification.')
    parser.add_argument('input', type=Path); args = parser.parse_args()
    try: print(json.dumps(verify(args.input), indent=2))
    except (ValueError, OSError, E.ParseError, BadZipFile, KeyError) as error: print(str(error), file=sys.stderr); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
