import json
from html.parser import HTMLParser
from pathlib import Path
import re
import sys


class TextCollector(HTMLParser):
    def __init__(self, svg_only=False):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.texts = set()
        self.svg_only = svg_only

    def handle_starttag(self, tag, attributes):
        if tag not in {'br', 'hr', 'img', 'input', 'meta', 'link'}:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attributes):
        pass

    def handle_endtag(self, tag):
        if tag in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index(tag)
            del self.stack[index:]

    def handle_data(self, text):
        if any(tag in self.stack for tag in ['script', 'style', 'code', 'pre']):
            return
        if self.svg_only and not any(tag in self.stack for tag in ['text', 'tspan', 'title', 'desc']):
            return
        text = text.strip()
        if text and any(character.isalpha() for character in text):
            self.texts.add(text)


def narrative_strings(data):
    values = set()

    def add(value, markup=False):
        if not isinstance(value, str) or not value.strip():
            return
        if markup:
            parser = TextCollector()
            parser.feed(value)
            values.update(parser.texts)
        else:
            values.add(value.strip())

    def explain(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {'title', 'summary', 'takeaway', 'alt', 'text'}:
                    add(item)
                elif isinstance(item, (dict, list)):
                    explain(item)
        elif isinstance(value, list):
            for item in value:
                explain(item)

    add(data.get('meta', {}).get('title'))
    for value in data.get('presentation', {}).get('cockpit_labels', {}).values():
        add(value, markup=True)
    for group in data.get('cockpit', {}).values():
        for item in group:
            add(item[0] if isinstance(item, list) else item, markup=True)
    for journey in data.get('journeys', []):
        add(journey.get('label'), markup=True)
        add(journey.get('note'), markup=True)
    for card in data.get('cards', []):
        add(card.get('title'), markup=True)
        add(card.get('body'), markup=True)
    for section in data.get('sections_meta', []):
        for value in section[1:3]:
            add(value, markup=True)
    for item in data.get('next_actions', []):
        add(item[2] if isinstance(item, list) else item, markup=True)
    explain(data.get('explainer', {}))
    return values


def validate(data_path, asset_paths):
    data = json.loads(Path(data_path).read_text())
    presentation = data.get('presentation', {})
    source = presentation.get('language', 'en')
    dictionaries = data.get('translations', {})
    languages = presentation.get('languages', [source] + list(dictionaries))
    languages = list(dict.fromkeys(languages))
    if len(languages) <= 1:
        return []
    if source not in languages or set(languages) - {'nl', 'en'}:
        return ['Bilingual presentation.languages must contain nl and en and include presentation.language.']
    strings = narrative_strings(data)
    for path in asset_paths:
        collector = TextCollector(svg_only=True)
        collector.feed(Path(path).read_text())
        strings.update(collector.texts)
    interface = json.loads((Path(__file__).parent / 'interface-translations.json').read_text())
    known_interface = set(interface) | set(interface.values())
    source_reference = re.compile(r'^[\w./-]+\.(?:py|kt|java|ts|tsx|js|go|rs|sql|yml|yaml|md|json)(?::[^\s]+)?$')
    strings = {text for text in strings if text not in known_interface and not source_reference.fullmatch(text)}
    errors = []
    for language in languages:
        if language == source:
            continue
        dictionary = dictionaries.get(language)
        if not isinstance(dictionary, dict):
            errors.append(f'Missing translations.{language} dictionary.')
            continue
        for text in sorted(strings):
            translated = dictionary.get(text)
            if not isinstance(translated, str) or not translated.strip():
                errors.append(f'Missing translations.{language}: {text}')
    return errors


if __name__ == '__main__':
    issues = validate(sys.argv[1], sys.argv[2:])
    if issues:
        print('\n'.join(issues), file=sys.stderr)
        sys.exit(2)
