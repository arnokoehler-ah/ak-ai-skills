# Bilingual overview contract

New reports provide one offline page with NL and EN. Author the base content once, then provide an exact-text dictionary for the other language. The source inventory remains canonical; the translation is a presentation of the same evidence, not a second analysis.

## Canonical YAML and derived JSON

```yaml
presentation:
  language: nl
  languages: [nl, en]
translations:
  en:
    "Orders ophalen": "Fetch orders"
    "Elke order haalt een klant op.": "Each order fetches a customer."
    "Productielatency is onbekend.": "Production latency is unknown."
    "OrderDesk": "OrderDesk"
```

Include `presentation` and `translations` in `docs/current-state.yaml` and derive the same fields in `docs/overview-data.json`. An English-source report uses `language: en` and `translations.nl` instead. Dictionaries contain plain strings, never translated HTML markup.

## What needs an entry

Cover these source strings exactly, including punctuation and case:

- Project title, cockpit labels and statements, journey labels and notes.
- Inventory card titles/body text, section titles/descriptions, and next-action text.
- Every explanatory title, summary, takeaway, alt description, detail paragraph and proposed action.
- Text/title/description nodes in the authored SVG illustrations and rendered C4, sequence and ER diagrams.

For existing inventory text containing inline markup, translate its visible text fragments. Code and preformatted blocks remain unchanged. Exact file references, evidence fields, module/route IDs, confidence values, timestamps and action IDs retain their source meaning. Shared product names and protocol labels can map to themselves. The UI's standard Dutch/English translations are bundled in `assets/interface-translations.json`.

The build prints missing dictionary keys and fails before replacing the output. Complete those translations and rebuild. A word-for-word identity mapping is for genuinely shared technical terms, not a shortcut for leaving prose untranslated. Browser-check both languages: translated text must fit the SVG geometry.

## Runtime behavior

The NL/EN switch changes text in place, including generated diagram labels. It preserves disclosure state, diagram selection and zoom, filter values, code, evidence links and action identities. Search includes text from both visited languages. A checklist re-render uses the selected language. Language preference is stored per source project title; checklist persistence retains the existing key and stable action IDs.

For next actions, prefer the existing tuple form `[stable_id, priority, text, evidence]`. Keep the ID fixed when changing wording or language. No network translation service is called.

## Compatibility

Input without bilingual languages or dictionaries keeps its existing single-language behavior and does not show a nonfunctional toggle. New reports use the bilingual contract unless the user explicitly asks for one language. Python 3 runs translation coverage validation during the local build; no Python or external assets are needed to read the final HTML.
