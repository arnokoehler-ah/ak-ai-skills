import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from playwright.sync_api import sync_playwright


SKILL = Path(__file__).resolve().parents[1]
SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180" role="img" aria-labelledby="flow-title"><title id="flow-title">Orders go to the database</title><rect x="20" y="30" width="140" height="90" rx="12" fill="#87ead0"/><text x="35" y="80" fill="#14213a">Orders</text><path d="M180 75h60" stroke="#87ead0" stroke-width="5"/><rect x="260" y="30" width="120" height="90" rx="12" fill="#a3bdff"/></svg>'


def overview_data():
    data = json.loads((SKILL / 'assets/example-overview-data.json').read_text())
    data.pop('translations', None)
    data['presentation'].pop('languages', None)
    data['presentation']['language'] = 'nl'
    data['explainer'] = {
        'title': 'Orders zonder omwegen',
        'summary': 'De API haalt orders op en zoekt daarna per order de klant.',
        'confidence': 'VERIFIED',
        'basis': 'code',
        'evidence': 'src/orders.py:20-31',
        'cards': [{
            'id': 'order-lookups',
            'title': 'Haal pakketjes samen op',
            'takeaway': 'Elke order veroorzaakt nu een extra klantlookup.',
            'illustration': 'order-flow',
            'alt': 'Losse klantvragen naast een gezamenlijke lading',
            'confidence': 'VERIFIED',
            'basis': 'code',
            'evidence': 'src/orders.py:31',
            'details': [
                {'title': 'Wat is bekend?', 'text': 'De klantquery staat binnen de lus.', 'confidence': 'VERIFIED', 'basis': 'code', 'evidence': 'src/orders.py:31'},
                {'title': 'Wat is niet gemeten?', 'text': 'Productielatency is onbekend.', 'confidence': 'UNKNOWN', 'basis': 'unknown', 'evidence': ''}
            ],
            'action': {'text': 'Onderzoek het batchen van klantqueries.', 'effort': 'small'},
            'diagram_ids': ['c4-context', 'seq-apply']
        }]
    }
    return data


def bilingual_data():
    data = overview_data()
    data['meta']['title'] = 'OrderDesk'
    data['presentation']['languages'] = ['nl', 'en']
    data['presentation']['cockpit_labels'] = {'works': 'Werkt', 'partial': 'Onbekend', 'bites': 'Aandacht'}
    data['cockpit'] = {'works': ['Orders worden gelezen.'], 'partial': [], 'bites': []}
    data['journeys'] = [{'id': 'orders', 'label': 'Orders lezen', 'confidence': 'VERIFIED'}]
    data['cards'] = [{'section': 'flow', 'title': 'Klantopvragen', 'body': 'Iedere order haalt een klant op.', 'evidence': 'src/orders.py:31', 'confidence': 'VERIFIED', 'risk': 'medium', 'modules': ['orders'], 'journeys': ['orders']}]
    data['sections_meta'] = [['flow', 'Gegevensstroom', 'Bewijs uit de code.']]
    data['next_actions'] = [['measure-orders', 'info', 'Meet de klantqueries.', 'src/orders.py:31']]
    data['translations'] = {'en': {
        'OrderDesk': 'OrderDesk', 'Werkt': 'Working', 'Onbekend': 'Unknown', 'Aandacht': 'Attention',
        'Orders worden gelezen.': 'Orders are read.', 'Orders lezen': 'Read orders',
        'Klantopvragen': 'Customer queries', 'Iedere order haalt een klant op.': 'Each order fetches a customer.',
        'Gegevensstroom': 'Data flow', 'Bewijs uit de code.': 'Evidence from the code.',
        'Meet de klantqueries.': 'Measure customer queries.',
        'Orders zonder omwegen': 'Orders without detours',
        'De API haalt orders op en zoekt daarna per order de klant.': 'The API fetches orders, then a customer for each order.',
        'Haal pakketjes samen op': 'Collect parcels together',
        'Elke order veroorzaakt nu een extra klantlookup.': 'Each order currently causes another customer lookup.',
        'Losse klantvragen naast een gezamenlijke lading': 'Individual customer queries beside a combined batch',
        'Wat is bekend?': 'What is known?', 'De klantquery staat binnen de lus.': 'The customer query is inside the loop.',
        'Wat is niet gemeten?': 'What has not been measured?', 'Productielatency is onbekend.': 'Production latency is unknown.',
        'Onderzoek het batchen van klantqueries.': 'Investigate batching customer queries.',
        'Orders go to the database': 'Orders go to the database', 'Orders': 'Orders',
        'STUBSVGMARKER': 'TRANSLATED-DIAGRAM',
    }}
    return data


class VisualOverviewTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        browser_path = os.environ.get('PDV_BROWSER')
        chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        if not browser_path and chrome.exists():
            browser_path = str(chrome)
        options = {'headless': True}
        if browser_path:
            options['executable_path'] = browser_path
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pdv-visual-')
        self.root = Path(self.temp.name)
        self.docs = self.root / 'docs'
        (self.docs / 'diagrams').mkdir(parents=True)
        (self.docs / 'illustrations').mkdir()
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 950}, offline=True, reduced_motion='reduce')
        self.page = self.context.new_page()
        self.page.set_default_timeout(1800)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.data = overview_data()

    def tearDown(self):
        self.context.close()
        self.temp.cleanup()

    def build(self, diagrams=False, illustrations=True):
        (self.docs / 'overview-data.json').write_text(json.dumps(self.data, ensure_ascii=False))
        if illustrations:
            (self.docs / 'illustrations/order-flow.svg').write_text(SVG)
        env = dict(os.environ)
        if diagrams:
            stub = self.root / 'bin'
            stub.mkdir(exist_ok=True)
            shutil.copy(SKILL / 'tests/fake-plantuml', stub / 'plantuml')
            (stub / 'plantuml').chmod(0o755)
            env['PATH'] = f'{stub}:/usr/bin:/bin'
            for filename in ['arch.puml', 'c4-context.puml', 'c4-container.puml', 'seq-apply.puml']:
                (self.docs / 'diagrams' / filename).write_text('@startuml\nAlice -> Bob: request\n@enduml\n')
        else:
            env['PATH'] = '/usr/bin:/bin'
        result = subprocess.run(['/bin/bash', str(SKILL / 'assets/build.sh'), str(self.root)], env=env, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.docs / 'project-overview.html'
        self.page.goto(output.as_uri())
        self.assertEqual(self.errors, [])
        return output

    def test_visual_intro_and_evidence_are_visible_before_technical_detail(self):
        self.build()
        self.assertTrue(self.page.get_by_role('heading', name='Orders zonder omwegen', exact=True).is_visible())
        card = self.page.locator('#explain-order-lookups')
        self.assertTrue(card.locator('svg').is_visible())
        self.assertIn('Uit de code', card.inner_text())
        self.assertIsNone(card.locator('details').get_attribute('open'))
        card.locator('summary').focus()
        self.page.keyboard.press('Enter')
        self.assertIn('Productielatency is onbekend.', card.inner_text())
        self.assertIn('UNKNOWN', card.inner_text())
        self.assertTrue(self.page.locator('#q').is_visible())

    def test_c4_sequence_and_architecture_tabs_remain_navigable(self):
        self.build(diagrams=True)
        for pane in ['arch', 'c4-context', 'c4-container', 'seq']:
            self.page.locator(f'.dgtabs button[data-pane="{pane}"]').click()
            self.assertTrue(self.page.locator(f'#pane-{pane}').is_visible())
        self.page.locator('#explain-order-lookups summary').click()
        self.page.locator('[data-diagram="seq-apply"]').click()
        self.assertTrue(self.page.locator('#diagram-seq-apply').is_visible())
        before = self.page.locator('#pane-seq .dgwrap').evaluate('el => el.scrollWidth')
        self.page.get_by_role('button', name='Vergroten', exact=True).click()
        self.assertGreaterEqual(self.page.locator('#pane-seq .dgwrap').evaluate('el => el.scrollWidth'), before)

    def test_old_input_keeps_filters_and_saved_actions(self):
        self.data.pop('explainer')
        self.build()
        self.page.locator('#q').fill('no-such-module')
        self.assertEqual(self.page.locator('details.sec:visible').count(), 0)
        self.page.locator('#reset').click()
        self.assertGreater(self.page.locator('details.sec:visible').count(), 0)
        checkbox = self.page.locator('#next input').first
        checkbox.check()
        self.page.reload()
        self.assertTrue(self.page.locator('#next input').first.is_checked())

    def test_mobile_and_open_details_have_no_horizontal_page_overflow(self):
        self.build(diagrams=True)
        for width in [375, 768, 1280]:
            self.page.set_viewport_size({'width': width, 'height': 900})
            self.page.locator('#explain-order-lookups details').evaluate('el => el.open = true')
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'), width)

    def test_long_cockpit_evidence_wraps_without_stretching_grid(self):
        path = 'catalog-service/src/main/kotlin/example/catalog/service/ProductRelationServiceWithALongName.kt:127-157'
        self.data['cockpit']['works'] = [['VERIFIED · Virtuele bundels', path]]
        self.data['cockpit']['bites'] = [f'VERIFIED · Labeltransactie verdient aandacht — {path}']
        self.build()
        for width in [375, 768, 1280]:
            self.page.set_viewport_size({'width': width, 'height': 900})
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'), width)

    def test_missing_illustration_keeps_caption_and_explanation_accessible(self):
        self.build(illustrations=False)
        card = self.page.locator('#explain-order-lookups')
        self.assertTrue(card.is_visible())
        self.assertIn('Losse klantvragen naast een gezamenlijke lading', card.inner_text())
        card.locator('summary').click()
        self.assertIn('De klantquery staat binnen de lus.', card.inner_text())

    def test_plain_text_and_script_terminators_do_not_break_rendering(self):
        self.data['explainer']['title'] = 'Orders <b>letterlijk</b> </script>'
        self.build()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), self.data['explainer']['title'])
        self.assertEqual(self.page.locator('#explainer-title b').count(), 0)

    def test_legacy_sequence_names_with_dots_spaces_and_unicode_still_render(self):
        names = ['seq-order.created', 'seq-order updated', 'seq-bestelling-ontvángen']
        self.data['explainer']['cards'][0]['diagram_ids'] = names
        for name in names:
            (self.docs / 'diagrams' / f'{name}.puml').write_text('@startuml\nAlice -> Bob: request\n@enduml\n')
        self.build(diagrams=True)
        self.page.locator('#explain-order-lookups summary').click()
        for name in names:
            self.page.get_by_role('button', name=f'{name} ↗', exact=True).click()
            self.assertTrue(self.page.get_by_role('heading', name=name[4:], exact=True).is_visible())

    def test_svg_quoted_urls_and_stylesheet_ids_keep_markers_gradients_and_colors(self):
        illustration = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180">
          <style>path#route { stroke: #fff; marker-end: url('#arrow'); }</style>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6"><path d="M0 0L10 5L0 10Z"/></marker>
            <linearGradient id="paint"><stop stop-color="#87ead0"/><stop offset="1" stop-color="#a3bdff"/></linearGradient>
          </defs>
          <g id="fff"/>
          <path id="route" d="M20 50h300" stroke-width="4"/>
          <path id="order-lookups-route" d="M20 75h300"/>
          <path id="inline-route" d="M20 100h300" style="stroke: #fff; marker-end: url('#arrow')"/>
          <rect id="gradient-box" x="20" y="120" width="100" height="40" fill="url( '#paint' )"/>
        </svg>'''
        (self.docs / 'illustrations/order-flow.svg').write_text(illustration)
        self.build(illustrations=False)
        result = self.page.locator('#explain-order-lookups svg').evaluate('''svg => {
          const paths = ['route', 'inline-route'].map(id => svg.querySelector('[id$="-' + id + '"]'));
          return {
            markers: paths.map(path => getComputedStyle(path).markerEnd),
            colors: paths.map(path => getComputedStyle(path).stroke),
            fill: getComputedStyle(svg.querySelector('[id$="-gradient-box"]')).fill,
            markerExists: Boolean(svg.querySelector('#order-lookups-arrow')),
            gradientExists: Boolean(svg.querySelector('#order-lookups-paint'))
          };
        }''')
        self.assertTrue(result['markerExists'])
        self.assertTrue(result['gradientExists'])
        self.assertTrue(all('#order-lookups-arrow' in value for value in result['markers']), result)
        self.assertEqual(result['colors'], ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'])
        self.assertIn('#order-lookups-paint', result['fill'])

    def test_language_switch_translates_content_and_diagrams_without_losing_state(self):
        self.data = bilingual_data()
        self.build(diagrams=True)
        self.page.locator('#explain-order-lookups summary').click()
        self.page.locator('.dgtabs button[data-pane="seq"]').click()
        self.page.get_by_role('button', name='Vergroten', exact=True).click()
        self.page.locator('#next input').first.check()
        self.page.locator('#mod').select_option('orders')
        self.page.get_by_role('button', name='English', exact=True).click()
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'Orders without detours')
        self.assertIsNotNone(self.page.locator('#explain-order-lookups details').get_attribute('open'))
        self.assertTrue(self.page.locator('#pane-seq').is_visible())
        self.assertEqual(self.page.locator('#diagram-zoom-level').inner_text(), '115%')
        self.assertEqual(self.page.locator('#mod').input_value(), 'orders')
        self.assertTrue(self.page.locator('#next input').first.is_checked())
        self.assertIn('TRANSLATED-DIAGRAM', self.page.locator('#pane-seq svg').text_content())
        self.assertIn('Working', self.page.locator('#lbl-works').inner_text())
        self.assertIn('src/orders.py:31', self.page.locator('#explain-order-lookups').inner_text())
        self.page.locator('#q').fill('customer queries')
        self.assertEqual(self.page.locator('details.sec .card:visible').count(), 1)
        self.page.locator('#next input').first.uncheck()
        self.page.wait_for_function('document.querySelector("#next").textContent.includes("Measure customer queries.")')
        self.page.get_by_role('button', name='Nederlands', exact=True).click()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'Orders zonder omwegen')
        self.assertEqual(self.page.locator('details.sec .card:visible').count(), 1)
        self.assertEqual(self.page.locator('#q').input_value(), 'customer queries')
        self.assertEqual(self.errors, [])

    def test_language_preference_survives_reload_and_mobile_layout(self):
        self.data = bilingual_data()
        self.build(diagrams=True)
        self.page.get_by_role('button', name='English', exact=True).focus()
        self.page.keyboard.press('Enter')
        self.page.reload()
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')
        for width in [375, 768, 1280]:
            self.page.set_viewport_size({'width': width, 'height': 900})
            for label in ['Nederlands', 'English']:
                self.page.get_by_role('button', name=label, exact=True).click()
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'), (width, label))

    def test_bilingual_build_rejects_missing_translations(self):
        self.data = bilingual_data()
        del self.data['translations']['en']['Productielatency is onbekend.']
        (self.docs / 'overview-data.json').write_text(json.dumps(self.data))
        (self.docs / 'illustrations/order-flow.svg').write_text(SVG)
        env = dict(os.environ)
        env['PATH'] = '/usr/bin:/bin'
        result = subprocess.run(['/bin/bash', str(SKILL / 'assets/build.sh'), str(self.root)], env=env, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Productielatency is onbekend.', result.stderr)

    def test_switching_language_preserves_explicitly_collapsed_filtered_sections(self):
        self.data = bilingual_data()
        self.build()
        self.page.locator('#mod').select_option('orders')
        self.page.locator('#collapse').click()
        self.assertIsNone(self.page.locator('#s-flow').get_attribute('open'))
        self.page.get_by_role('button', name='English', exact=True).click()
        self.assertIsNone(self.page.locator('#s-flow').get_attribute('open'))

    def test_prototype_property_names_are_plain_source_text(self):
        self.data = bilingual_data()
        self.data['explainer']['title'] = 'constructor'
        self.data['translations']['en']['constructor'] = 'Constructor overview'
        self.build()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'constructor')
        self.page.get_by_role('button', name='English', exact=True).click()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'Constructor overview')

    def test_standalone_svg_styles_do_not_leak_between_illustrations(self):
        self.data['explainer']['cards'].append(dict(self.data['explainer']['cards'][0], id='second', illustration='second-flow'))
        for name, color in [('order-flow', 'red'), ('second-flow', 'blue')]:
            (self.docs / 'illustrations' / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>.shape {{ fill: {color}; }}</style><rect class="shape" x="10" y="10" width="80" height="80"/></svg>')
        self.build(illustrations=False)
        colors = [self.page.locator(f'#explain-{name} rect.shape').evaluate('element => getComputedStyle(element).fill') for name in ['order-lookups', 'second']]
        self.assertEqual(colors, ['rgb(255, 0, 0)', 'rgb(0, 0, 255)'])

    def test_markup_action_accessible_name_tracks_the_translated_label(self):
        self.data = bilingual_data()
        self.data['next_actions'][0][2] = 'Meet de <b>klantqueries</b>.'
        self.data['translations']['en'].update({'Meet de': 'Measure the', 'klantqueries': 'customer queries'})
        self.build()
        self.page.get_by_role('button', name='English', exact=True).click()
        self.assertEqual(self.page.get_by_role('checkbox', name='INFO Measure the customer queries. src/orders.py:31', exact=True).count(), 1)

    def test_english_source_can_switch_to_dutch(self):
        source = bilingual_data()
        translations = source.pop('translations')['en']

        def translate(value):
            if isinstance(value, str):
                return translations.get(value, value)
            if isinstance(value, list):
                return [translate(item) for item in value]
            if isinstance(value, dict):
                return {key: translate(item) for key, item in value.items()}
            return value

        self.data = translate(source)
        self.data['presentation']['language'] = 'en'
        self.data['translations'] = {'nl': {translated: original for original, translated in translations.items()}}
        self.build()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'Orders without detours')
        self.page.get_by_role('button', name='Nederlands', exact=True).click()
        self.assertEqual(self.page.locator('#explainer-title').inner_text(), 'Orders zonder omwegen')

    def test_svg_scoping_preserves_selector_list_specificity(self):
        (self.docs / 'illustrations/order-flow.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>rect, #highlight { fill: red; } .shape { fill: blue; }</style><rect class="shape" x="10" y="10" width="80" height="80"/></svg>')
        self.build(illustrations=False)
        self.assertEqual(self.page.locator('#explain-order-lookups rect.shape').evaluate('element => getComputedStyle(element).fill'), 'rgb(0, 0, 255)')


if __name__ == '__main__':
    unittest.main(verbosity=2)
