# Portfolio X-Ray · Studio Bridge Exhibit 5

```
npm install
python3 tools/derive_assets.py <path-to>/StudioBridge_All5_Assets <dir-with bachat.pdf canva.pdf>   # optional: regenerates derived art + page renders
npm run build                      # → dist/
cd dist && python3 -m http.server 8768   # then: python3 qa_interaction_tests.py / qa_viewport_tests.py
```

- **Edit the content** in `src/data/content.json`. It holds the copy, the statuses, the layers, and each specimen's findings, hotspots and provenance.
- **Hotspot boxes** are percentages of the page image.
- **Statuses:** `visible`, `documented`, `notprovided` and `cannot`. Use `notprovided` when the file doesn't say, and `cannot` when no document could say.
- **Keyboard, in the chamber:**
  - ←/→ turn the page;
  - S scans or pauses;
  - 1 selects all layers, and 2–8 select a single layer;
  - M magnifies, C changes the contrast, O changes the overlay;
  - L opens the lightbox;
  - Esc closes any panel.
