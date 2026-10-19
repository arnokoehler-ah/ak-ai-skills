# Bilingual rendering and distribution

## Context

The visual introduction and technical viewer already work together, but their language was fixed at generation time. A report-specific toggle demonstrated the desired reading experience. The same capability now needs to be reusable and installable through both the portable and employer-scoped APM packages.

## Decisions

- Store exact-text translation dictionaries alongside the canonical inventory and derive them unchanged into render JSON. The source-language content remains the analysis of record.
- Translate rendered text and accessible labels in place. Preserve DOM identity so disclosure state, diagram tabs, zoom, evidence and action keys survive switching.
- Observe text inserted by the existing filters/checklist rather than rebuilding the entire viewer in a second language. Preserve search text for both visited languages.
- Validate authored prose and rendered SVG labels at build time with Python's standard library. Legacy single-language input remains valid. Shared technical labels may use explicit identity entries.
- Publish the portable source as project-design-visualizer and the employer distribution as ah-project-design-visualizer. Keep the tested implementation identical and derive the employer skill name deterministically to avoid APM name collisions.

## Trade-offs

Exact-text dictionaries must be updated when source prose changes; build-time coverage turns that drift into an explicit failure. Translations preserve SVG geometry, so authors must use concise labels and inspect both languages. Python 3 is an added build-time requirement; the resulting HTML remains self-contained and offline.
