# Exhibit 5: Portfolio X-Ray. QA report

**Version:** 1.0 · Studio Bridge · Exhibit 5 of 5
**Build:** React 19 + TypeScript + Vite 8. To build, run `npm install && npm run build`, then serve `dist/` from any static server (base `./`).
**Content source:** `src/data/content.json`. It holds:
- the core copy;
- the four statuses and the seven evidence layers;
- three specimens, each with findings per layer, page references, hotspots (page plus % box), the version pair and provenance;
- sources and disclaimers.

`src/data/pages.json` lists the rendered pages. `tools/derive_assets.py` regenerates the derived art and the page renders from the asset pack and the PDFs.

## The route
1. **Entrance** (PX_ENV_01). A hanging sign reads DEPARTMENT OF INVISIBLE WORK / PORTFOLIO IMAGING UNIT, and a notice explains the unit. "Walk to the doors", or clicking the doors, zooms the corridor towards the frosted doors.
2. **Doors.** PX_PROP_01 is split into two leaves that slide apart, with reception visible behind the glass.
3. **Reception** (PX_ENV_02):
   - the queue ticket printer issues PX-017, and the CRT monitor shows "NOW SERVING";
   - the specimen folders open "WHAT ARE WE EXAMINING TODAY?" with three FORM_02 folder covers filled in live;
   - the clipboard holds the FORM_01 registration with live fields and the declaration "I understand the unit examines documents, not people."
4. **Imaging chamber** (PX_ENV_03):
   - **Imaging panel:**
     - a scan beam with an X-ray reveal and the scanning arm (SCAN_02);
     - pause and resume;
     - hotspot notes that appear only after a page is scanned, each linked to its source page;
     - a magnifier lens at 2× or 3×.
   - **Page strip:** thumbnails show scanned and note counts.
   - **Readout:** the selected note, or the current layer's findings with page links and the question to ask.
   - **Physical controls:**
     - the mode selector (SCAN_05): key A selects all layers, keys 2–8 the seven layers, and ▶ scans;
     - the knobs (SCAN_04) set magnify, contrast (normal / high / X-ray), overlay (notes / status map / off) and page;
     - the desk lamp (PROP_03);
     - the imaging table (SCAN_01), which opens the lightbox;
     - the report printer (SCAN_06), which feeds paper and shows its status.
   - **Compare:** pretotypes (p. 10) against prototypes (p. 12) with a split slider, plus a seven-layer table across all three specimens.
   - **Research drawer:** the ethics gate, the status key, provenance, sources and disclaimers.
5. **Report.** The FORM_03 header plus a live seven-layer report. Every finding is marked VISIBLE, DOCUMENTED, NOT PROVIDED or CANNOT BE INFERRED, with page references and "Ask:" questions. It can be printed, saved as a web page or as text, or copied.
6. **Exit** (PX_ENV_04). The sign reads "THE PORTFOLIO GOT US IN THE ROOM. THE QUESTIONS TAKE US FURTHER." Below it, "THE RESULT IS VISIBLE. THE ENTIRE WORKING PROCESS ISN'T." introduces the questions the file couldn't answer. From here you can examine another specimen (with a new ticket, PX-018) or start again.

## Specimens and why
- **A, Bachat Basics: the main specimen.** It has the most documented process:
  - seven changes attributed to user testing (p. 13);
  - paper pretotypes and printed prototypes (pp. 10–12);
  - a named "version two" kit (p. 16).

  It is a five-person team project, credited on p. 1 to Anagha Shetty, Avishi Maru, Kavya Nair, Nikita Chandramouli and Nishita Bajaj. **28 hotspots.**
- **B, Design DNA for Canva.** A campaign system with stated rationale (p. 21). It shows no research, drafts or iteration. Three people are credited on p. 1. **7 hotspots.**
- **C, Customers Na Milenge Dobaara (Nature's Basket).** A service story framed through three personas. It names no team, and shows no research or iteration. It is examined as a text record only (see below).

## Privacy and rights decisions
- **Bachat Basics p. 13:** the four photographs of user-testing participants are blurred, because they are private individuals.
- **Canva:**
  - Page 2 is not reproduced: it shows a real public figure.
  - Pages 5, 7, 9, 16 and 22 are not reproduced: they show people.
  - 16 of 22 pages are shown.
- **Nature's Basket:** no page images are shown. The slides use photo-real likenesses of well-known film actors, and the file doesn't say how the images were made or what permissions apply. The exhibit shows my own one-line summary of each of the 24 pages.

## Provenance notes surfaced in the exhibit
- **Bachat file name and metadata:** the file name names one team member ("Nikhita C"). The PDF author field shows another member's design-tool account. Neither says who made which part.
- **Bachat spelling:** the project name appears as both "Bachat" and "Bacchat".
- **Canva:** this is a student brief for a real brand. The file doesn't say Canva commissioned it.

## Tested (automated, headless Chrome)
- **Interactions: 74/74** (`qa_interaction_tests.py`). Covered:
  - **Entrance and doors:** the sign copy, the dolly into the corridor, the door leaves sliding apart, and arrival at reception.
  - **Reception:**
    - the folders stay locked until a ticket is taken;
    - the ticket is PX-017, the monitor shows it, and there are no duplicate tickets;
    - three folders with the correct flags;
    - the registration shows the five credited names and the exact file name;
    - the declaration gates the way in.
  - **Chamber:**
    - nothing is shown before a scan;
    - **pause:** the beam width was measured frozen;
    - **resume** completes the scan, with 8 notes on p. 13;
    - mode key 5 filters to Choices and Trade-offs, and the LCD updates;
    - a note names its source file and page;
    - page links jump to the cited page;
    - **magnifier:** the lens background measured at exactly 2× the page width, and 3× and off also work;
    - X-ray contrast inverts the page, and the overlay map and off modes work;
    - the page knob, ←/→ and the number keys all work;
    - lamp and lightbox: page and notes, 2× zoom, Esc to close;
    - the compare slider moves the split, and the specimens table is 7 × 3;
    - the research drawer shows the ethics gate, all four statuses and provenance.
  - **Report:**
    - the printer feeds paper and the LCD reads PRINTING;
    - all seven layers and all four statuses appear, with no score or rating;
    - Save as web page and Save as text download with the right content, and Copy works;
    - the print stylesheet prints only the report.
  - **Exit:**
    - the closing line is exact;
    - 10 questions appear for Bachat;
    - "Examine another specimen" issues PX-018 and stamps the examined folder.
  - **Canva:** 16 pages, with the excluded pages absent; the credit note appears; change history reads NOT PROVIDED; Compare shows NOT DOCUMENTED.
  - **Nature's Basket:** no images, IMAGE WITHHELD, 24 text records, no hotspots; the people layer says no names; the magnifier explains it only works on images.
  - **Reset and storage:** reset clears everything, nothing is persisted to storage, and there are no console errors or failed requests.
  - **Reduced motion:** the scan completes in about 250 ms.
  - **Keyboard only:** entrance → doors → ticket → folder → declaration → scan.
  - **Missing images:** labelled fallbacks appear, and the keys and scan still work.
  - **Blur check:** p. 13 participant photos are blurred (edge-energy check on the published JPG).
- **Viewports: 6/6** (`qa_viewport_tests.py`). Tested at:
  - 1920×1080, 1440×900 and 1366×768: the full stage;
  - 1024×768 tablet (touch): full stage with enlarged touch targets;
  - 768×1024 and 390×844 (touch): stacked panels with large controls.

  Each run goes from the entrance to the exit. At every size: 8 notes on p. 13, 7 report sections and 10 exit questions, no horizontal overflow, no errors, and every touch target at least 28 × 30 px.

## Not tested
- A real screen reader. Labels, live announcements and dialog focus are wired, but only checked automatically.
- Real touch hardware. Touch was emulated.
- Inside the claude.ai artifact viewer, downloads and printing may be blocked. Copy works, and the buttons say what happened.

## Assets: used vs skipped
**Used:** all 4 environments, all 4 forms, all 7 props, and 5 of the 6 scanner crops.

**Derived** (the originals are untouched; every derivation is recorded in `asset-manifest.json`):
- `PX_PROP_01__left` / `__right`: the doors split at the centre seam (x = 303).
- `PX_FORM_03__header`: rows 27–106 only. The baked section labels below contain a defect (see below), so the report sections are live text.

**Skipped:**
- `PX_SHEET_01`–`06`. The rules forbid showing whole sheets as live UI.
- `PX_SCAN_03_FilmClampsClips`. It is a loose pile of four clips, photographed at an angle, and doesn't sit convincingly on the front-facing imaging panel. The page sits in a bezel instead.

**Observed asset text defects (not silently replaced):**
- `PX_FORM_01_RegistrationForm`: the baked header starts with a stray apostrophe, "'DEPARTMENT OF INVISIBLE WORK". It is visible on the clipboard form.
- `PX_FORM_03_ExaminationReport`: the baked section label reads "EVIOENCE BEHINO THE DESIGN", and there are only 4 of the 7 layers. This is why only the header is used.
- `PX_FORM_04_InstitutionalPoster`: correct, and used on the reception wall.

**Resolution:** the plates are 1376×768, scaled about 1.4× at 1920×1080.

## Sources and disclaimers
**Sources:**
- The three supplied PDFs. Every page reference points into them.
- The Studio Bridge research synthesis, paraphrased.

**On screen:**
- The unit is a theatrical inspection metaphor. It doesn't detect skill, character, initiative or team compatibility.
- Statuses describe documents, not people. "Not provided" means the file doesn't say, not that the work wasn't done.
- The notes were written for this exhibit from a reading of the PDFs, and the scan computes nothing.
- Nothing is stored.
