# Verification record — 2026-10-21

- Node 22.19.0: 22 builder, content-validation, image and preview-preservation tests passed, including all four image-capable layouts.
- Actual Microsoft PowerPoint 16.114 on macOS rendered the six-slide example to PDF. Its PNGs were inspected for typography, spacing, clipping, chart labels and content fidelity. The committed example PPTX/PDF/preview are from that render.
- A fresh consuming agent followed the skill and built a new three-slide pilot proposal from supplied facts, retaining the unknown start date and avoiding invented progress data.
- Fresh code review reproduced boundary failures in long text, image aspect ratio, corrupt images and unsupported image/layout combinations. Seven regression tests first reproduced these failures, then passed after layout-aware text measurement, real image decoding, proportional crop metadata and explicit layout validation were added.
- Existing repository checks passed: skill structure, ten visualizer build assertions and 18 browser/translation cases.
- `npm audit` reported zero vulnerabilities after pinning the patched `image-size` 2.0.4 transitive dependency.

Rendering on this workstation was tested with PowerPoint. Linux/LibreOffice rendering passed in GitHub Actions run 39581867838. A fresh APM installation into Claude Code and OpenCode succeeded. Agent instructions are harness-neutral; the observed application test used OpenCode. A future generated deck still needs its own visual review.
