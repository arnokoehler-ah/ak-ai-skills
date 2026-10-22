# Verification record — 2026-10-21

- **33 automated tests passed** with Node22.19.0 and Python3.12.6: native geometry/editability, stable models, animation targets/clicks, manifest hash binding, output preservation, evidence/option contracts, invalid XML, dependency initialization, C4 input restrictions and no-install behavior.
- All six synthetic example slides were rendered through **Microsoft PowerPoint16.114** and inspected. The final changed interaction/table views were re-rendered after review fixes. The committed PPTX/PDF/preview files are built from the bundled source.
- Portable animation output was opened in PowerPoint. Native read-back recognized seven effects; three advances remained on the animated slide and the following advance moved to the next slide. Final animated and static layouts were inspected. This verifies native PowerPoint playback, not every presentation application's implementation.
- **PlantUML1.2025.10**, Java25.0.4 and Graphviz14.1.0 rendered the synthetic local C4 example to SVG and PNG under SANDBOX. No tool was installed by the doctor/renderer.
- A fresh consuming agent built a separate four-slide decision case, animated it in three clicks and ran the verifier. Unknown ROI/latency remained explicit; the baseline and alternatives were compared without inventing a winner. It reported visual/playback checks as pending, as instructed. Its source also rebuilt successfully after the review corrections.
- Fresh code review findings were reproduced with failing tests and fixed: vertical label/card overlap; invalid notes XML and incomplete package XML inspection; resolution-only native dependency checks; non-boolean option flags. The full33-test suite then passed. No deferred findings.
- Existing repository checks passed: 22 business-presentation tests, 18 visualizer browser/translation tests, the visualizer build assertions and four-skill structure validation. Dependency audit reported zero vulnerabilities.

CI additionally renders the generated animated deck with LibreOffice on Linux. A future deck still needs its own content, visual and playback review; this record verifies the package and examples, not future conclusions.
