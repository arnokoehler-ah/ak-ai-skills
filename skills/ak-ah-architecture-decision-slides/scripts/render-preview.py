import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from zipfile import ZipFile


def run(command, **options):
    result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=180, **options)
    return result.stdout.strip()


def find_libreoffice():
    executable = shutil.which('soffice') or shutil.which('libreoffice')
    mac_app = Path('/Applications/LibreOffice.app/Contents/MacOS/soffice')
    if executable:
        return executable
    if mac_app.is_file():
        return str(mac_app)
    raise ValueError('LibreOffice not found; install it or select --renderer powerpoint on macOS')


def render_powerpoint(source, output):
    run(['open', '-a', 'Microsoft PowerPoint', str(source)])
    script = '''on run argv
set sourceName to item 1 of argv
set targetFile to POSIX file (item 2 of argv)
set openedDeck to missing value
tell application "Microsoft PowerPoint"
    try
        repeat 100 times
            if exists presentation sourceName then exit repeat
            delay 0.1
        end repeat
        if not (exists presentation sourceName) then error "PowerPoint did not open the preview copy"
        set openedDeck to presentation sourceName
        save openedDeck in targetFile as save as PDF
        close openedDeck saving no
        return version
    on error errorMessage number errorNumber
        if openedDeck is not missing value then
            try
                close openedDeck saving no
            end try
        end if
        error errorMessage number errorNumber
    end try
end tell
end run'''
    return run(['osascript', '-e', script, source.name, str(output)])


def render_libreoffice(source, staging, executable):
    profile = (staging / 'office-profile').as_uri()
    run([executable, f'-env:UserInstallation={profile}', '--headless', '--convert-to', 'pdf', '--outdir', str(staging), str(source)])
    exported = source.with_suffix('.pdf')
    if not exported.is_file():
        raise ValueError('LibreOffice did not produce a PDF')
    exported.rename(staging / 'presentation.pdf')
    shutil.rmtree(staging / 'office-profile', ignore_errors=True)
    return run([executable, '--version'])


def write_gallery(staging, slides, title):
    cards = ''.join(f'<figure><a href="{p.name}"><img src="{p.name}" alt="Rendered slide {i}"></a><figcaption>Slide {i}</figcaption></figure>' for i, p in enumerate(slides, 1))
    document = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(title)}</title>
<style>body{{font-family:Arial,sans-serif;background:#f3f6f8;color:#003b67;margin:30px}}h1{{font-size:28px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:24px}}figure{{margin:0}}img{{width:100%;border-radius:6px;box-shadow:0 4px 18px #003b6718}}figcaption{{padding:10px 0;font-size:13px}}a{{color:#007aa9}}p{{line-height:1.6}}</style>
<h1>{html.escape(title)}</h1><p>Actual PPTX render · <a href="presentation.pdf">PDF</a> · inspect each slide for clipping, overlap, readability and factual accuracy.</p><main>{cards}</main></html>'''
    (staging / 'index.html').write_text(document, encoding='utf-8')


def create_preview(source, destination, renderer):
    source = source.resolve()
    destination = destination.resolve()
    if destination.exists():
        raise ValueError(f'Preview directory already exists: {destination}; choose a fresh directory')
    if source.suffix.lower() != '.pptx' or not source.is_file():
        raise ValueError('Input must be an existing .pptx file')
    rasterizer = shutil.which('pdftoppm')
    if not rasterizer:
        raise ValueError('pdftoppm not found; install Poppler to render slide PNGs')
    office = find_libreoffice() if renderer == 'libreoffice' else None
    if renderer == 'powerpoint' and sys.platform != 'darwin':
        raise ValueError('The PowerPoint renderer requires macOS; use LibreOffice on this platform')
    with ZipFile(source) as archive:
        expected_slides = sum(bool(re.fullmatch(r'ppt/slides/slide\d+\.xml', name)) for name in archive.namelist())
    if expected_slides < 1:
        raise ValueError('Input PPTX contains no slides')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.ah-preview-', dir=destination.parent) as directory:
        staging = Path(directory)
        snapshot = staging / f'preview-{uuid.uuid4().hex}.pptx'
        shutil.copyfile(source, snapshot)
        pdf = staging / 'presentation.pdf'
        version = render_powerpoint(snapshot, pdf) if renderer == 'powerpoint' else render_libreoffice(snapshot, staging, office)
        if not pdf.is_file() or not pdf.stat().st_size:
            raise ValueError('The presentation application did not produce a PDF')
        run([rasterizer, '-png', '-scale-to', '1600', str(pdf), str(staging / 'slide')])
        slides = sorted(staging.glob('slide-*.png'), key=lambda p: int(p.stem.split('-')[-1]))
        if len(slides) != expected_slides:
            raise ValueError(f'Rendered {len(slides)} slides; PPTX contains {expected_slides}')
        snapshot.unlink()
        write_gallery(staging, slides, source.stem)
        report = {'sourceSha256': source_hash, 'slides': expected_slides, 'renderer': renderer, 'rendererVersion': version, 'visualReview': 'pending'}
        (staging / 'verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        staging.rename(destination)
    return {'preview': str(destination / 'index.html'), **report}


def main():
    parser = argparse.ArgumentParser(description='Render a PPTX in an Office application and build a PNG gallery. The output directory must be new.')
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--renderer', choices=['libreoffice', 'powerpoint'], default='libreoffice')
    args = parser.parse_args()
    try:
        print(json.dumps(create_preview(args.input, args.output, args.renderer), indent=2))
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            print(error.stderr, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
