import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from xml.etree import ElementTree as E
from c4 import executable, version, render_bytes, smoke_source


def probe(name, arguments):
    binary = shutil.which(name)
    if not binary: return {'state': 'missing'}
    try:
        result = subprocess.run([binary, *arguments], capture_output=True, text=True, timeout=15)
        output = (result.stdout.strip() or result.stderr.strip()).splitlines()
        return {'state': 'ready' if result.returncode == 0 else 'broken', 'path': binary, 'version': output[0][:200] if output else ''}
    except (OSError, subprocess.SubprocessError) as error:
        return {'state': 'broken', 'path': binary, 'error': str(error)}


def main():
    root = Path(__file__).resolve().parents[1]
    node = probe(os.environ.get('NODE_BIN') or 'node', ['--version'])
    if node['state'] == 'ready':
        match = re.match(r'v(\d+)', node.get('version', ''))
        if not match or int(match[1]) < 22: node.update(state='broken', error='Node 22+ is required')
    dependencies = {'state': 'missing'}
    if node['state'] == 'ready':
        try:
            check_script = """for (const name of ['pptxgenjs','sharp','string-pixel-width']) {
try { require.resolve(name); } catch (error) { console.log(JSON.stringify({state:'missing',dependency:name,error:error.message})); process.exit(0); }
try { require(name); } catch (error) { console.log(JSON.stringify({state:'broken',dependency:name,error:error.message})); process.exit(0); }
}
console.log(JSON.stringify({state:'ready'}));"""
            check = subprocess.run([node['path'], '-e', check_script], cwd=root, capture_output=True, text=True, timeout=10)
            dependencies = json.loads(check.stdout) if check.returncode == 0 else {'state': 'broken', 'error': check.stderr[:500]}
        except (OSError, subprocess.SubprocessError, ValueError) as error: dependencies = {'state': 'broken', 'error': str(error)}
    plantuml = {'state': 'missing'}
    binary = executable()
    if binary:
        try:
            tool_version = version(binary); render_bytes(binary, smoke_source(), 'svg')
            plantuml = {'state': 'ready', 'path': binary, 'version': tool_version, 'localC4Render': True, 'securityProfile': 'SANDBOX'}
        except (ValueError, OSError, subprocess.SubprocessError, E.ParseError) as error: plantuml = {'state': 'broken', 'path': binary, 'error': str(error)}
    report = {
        'python': {'state': 'ready' if sys.version_info >= (3, 10) else 'broken', 'version': sys.version.split()[0]},
        'node': node, 'dependencies': dependencies, 'java': probe('java', ['-version']), 'graphviz': probe('dot', ['-V']), 'plantuml': plantuml,
        'libreoffice': probe('soffice' if shutil.which('soffice') else 'libreoffice', ['--version']),
        'powerpointMac': {'state': 'ready' if Path('/Applications/Microsoft PowerPoint.app').is_dir() else 'missing'},
        'poppler': probe('pdftoppm', ['-v']),
        'portableAnimationAuthoring': True, 'installsPerformed': False,
        'installationPolicy': 'Report source, version, scope and required permissions; request explicit approval before any installation. Never auto-elevate, pipe downloaded scripts to a shell, or switch to remote rendering.'
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
