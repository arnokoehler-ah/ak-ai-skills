# Native editable PowerPoint with a local reference package

The requested deliverable is an editable PowerPoint whose titles, diagrams and charts remain useful to colleagues after generation. Use PptxGenJS with bounded content-driven layouts rather than screenshot-based slide export; render the resulting PPTX in an Office-compatible application to verify its appearance. Each installed skill includes its own pinned builder and assets so a consuming project does not depend on another skill repository at runtime.

Measure text using Arial metrics and a conservative line-height allowance before writing a deck; character counts alone accepted visibly overflowing content. Decode local images with Sharp to reject corrupt content and derive real aspect ratios for native cropping. Keep `image-size` overridden to 2.0.4 because the version requested transitively by PptxGenJS has published parser-denial-of-service advisories.
