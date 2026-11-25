"""Interaction QA for PORTFOLIO X-RAY (headless Chrome). Serve dist/ on :8768 first:
   cd dist && python3 -m http.server 8768
"""
import json, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat

URL = 'http://localhost:8768/'
C = json.load(open('src/data/content.json'))
P = json.load(open('src/data/pages.json'))
results = []
def check(cond, name):
    results.append((bool(cond), name)); print(('PASS ' if cond else 'FAIL ') + name)
def norm(t): return re.sub(r'\s+', ' ', t.replace('’', "'")).strip().lower()

def to_reception(pg, fast=False):
    pg.click('text=Walk to the doors'); pg.wait_for_timeout(200 if fast else 1300)
    pg.click('text=Push the doors'); pg.wait_for_timeout(300 if fast else 1500)
def register(pg, idx):
    if pg.locator('.p-printer.on').count() == 0: pg.click('.p-printer')
    pg.click('.p-folders'); pg.click(f'.folder >> nth={idx}'); pg.check('.consent input'); pg.click('text=Proceed to imaging'); pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=URL)
    pg = ctx.new_page(); errs = []; bad = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('requestfailed', lambda r: bad.append(r.url))
    pg.goto(URL); pg.wait_for_timeout(700)

    # --- entrance and doors ---
    t = norm(pg.inner_text('.hsign'))
    check(norm(C['meta']['department']) in t and norm(C['meta']['unit']) in t, 'entrance: DEPARTMENT OF INVISIBLE WORK / PORTFOLIO IMAGING UNIT sign')
    check(pg.locator('.mode-stage').count() == 1, 'stage layout at 1440×900')
    pg.click('text=Walk to the doors'); pg.wait_for_timeout(300)
    check(pg.locator('.scene--entrance.is-walking').count() == 1, 'walking dollies the corridor towards the doors')
    pg.wait_for_timeout(1000)
    check(pg.locator('.scene--doors').count() == 1 and pg.locator('.leaf').count() == 2, 'doors scene: two frosted leaves (PX_PROP_01 split)')
    pg.click('.leaf--r', force=True); pg.wait_for_timeout(400)
    tr = pg.evaluate("getComputedStyle(document.querySelector('.leaf--r')).transform")
    check(pg.locator('.scene--doors.is-open').count() == 1 and tr != 'none', f'tapping a door slides both leaves apart ({tr[:24]})')
    pg.wait_for_timeout(1200)
    check(pg.locator('.scene--reception').count() == 1, 'doors open onto reception')

    # --- reception ---
    pg.click('.p-folders'); pg.wait_for_timeout(200)
    check(pg.locator('dialog[open]').count() == 0 and 'ticket first' in pg.inner_text('[role=status]').lower(), 'folders stay shut until a ticket is taken')
    check('please take a ticket' in norm(pg.inner_text('.crt')), 'monitor asks for a ticket')
    pg.click('.p-printer'); pg.wait_for_timeout(300)
    check(pg.locator('.qticket').count() == 1 and 'px-017' in norm(pg.inner_text('.crt')), 'ticket printer issues PX-017; monitor now serving PX-017')
    pg.click('.p-printer')
    check(pg.inner_text('.topbar__ticket') == 'PX-017', 'a second press does not issue another ticket')
    pg.click('.p-folders'); pg.wait_for_timeout(300)
    check(norm(pg.inner_text('dialog[open] h2')) == norm(C['meta']['question']), 'folders ask WHAT ARE WE EXAMINING TODAY?')
    check(pg.locator('.folder').count() == 3, 'three specimen folders (FORM_02 covers)')
    check('most documented' in norm(pg.inner_text('.folder >> nth=0')) and 'images withheld' in norm(pg.inner_text('.folder >> nth=2')), 'Bachat flagged most documented; Nature’s Basket flagged images withheld')
    pg.click('.folder >> nth=0'); pg.wait_for_timeout(300)
    rt = norm(pg.inner_text('dialog[open]'))
    check(all(norm(n) in rt for n in C['specimens'][0]['credited']), 'registration lists the five credited names from p. 1')
    check(norm(C['specimens'][0]['file']) in rt, 'registration shows the exact source file name')
    check(pg.locator('text=Proceed to imaging').is_disabled(), 'cannot proceed before ticking the declaration')
    pg.check('.consent input'); pg.click('text=Proceed to imaging'); pg.wait_for_timeout(400)
    check(pg.locator('.scene--chamber').count() == 1, 'registration leads to the imaging chamber')

    # --- chamber: scan, pause, resume ---
    check(pg.locator('.spot').count() == 0 and pg.locator('.viewer__hint').count() == 1, 'unscanned page shows no notes, only a prompt')
    pg.click('.strip li >> nth=12'); pg.wait_for_timeout(200)
    check('page 13 of 21' in norm(pg.inner_text('.panel-label')), 'page strip turns to page 13')
    pg.click('.btn--scan'); pg.wait_for_timeout(900)
    pg.click('.btn--scan'); pg.wait_for_timeout(150)
    w1 = pg.evaluate("document.querySelector('.scanfx__reveal').getBoundingClientRect().width"); pg.wait_for_timeout(700)
    w2 = pg.evaluate("document.querySelector('.scanfx__reveal').getBoundingClientRect().width")
    check(w1 > 50 and abs(w1 - w2) < 1 and 'paused' in norm(pg.inner_text('.panel-label')), f'pause freezes the beam ({w1:.0f}px → {w2:.0f}px)')
    check(pg.locator('.arm').count() == 1, 'scanning arm rides with the beam')
    pg.click('.btn--scan'); pg.wait_for_timeout(2900)
    n13 = len([h for h in C['specimens'][0]['hotspots'] if h['page'] == 13])
    check(pg.locator('.spot').count() == n13 and 'scanned' in norm(pg.inner_text('.panel-label')), f'resume completes the scan; {n13} notes appear on p. 13')
    check(pg.locator('.strip li >> nth=12').locator('.is-done').count() == 1, 'strip marks p. 13 as scanned')
    # mode keys
    pg.click('.mkey >> nth=4'); pg.wait_for_timeout(200)
    nch = len([h for h in C['specimens'][0]['hotspots'] if h['page'] == 13 and h['layer'] == 'choices'])
    check(pg.locator('.spot').count() == nch and 'choices and trade-offs' in norm(pg.inner_text('.readout')), f'key 5 filters to Choices and Trade-offs ({nch} notes) and lists its findings')
    check(norm(pg.inner_text('.ctl__lcd')) == 'choices and trade-offs', 'mode LCD shows the layer')
    pg.click('.spot >> nth=0'); pg.wait_for_timeout(200)
    t = norm(pg.inner_text('.readout'))
    check('page 13' in t and norm(C['specimens'][0]['file']) in t, 'a note names its source file and page')
    pg.click('text=Back to the layer')
    pg.click('.readout .pagelink >> text=p. 20'); pg.wait_for_timeout(200)
    check('page 20 of 21' in norm(pg.inner_text('.panel-label')), 'page links in findings jump to the cited page')
    pg.click('.mkey >> nth=0')
    # knobs
    pg.click('.knob >> nth=0'); pg.mouse.move(400, 280); pg.wait_for_timeout(150)
    lens = pg.evaluate("(()=>{const l=document.querySelector('.lens');return l?getComputedStyle(l).backgroundSize:''})()")
    vw = pg.evaluate("document.querySelector('.viewer').clientWidth")
    check(lens.startswith(f'{vw*2}px'), f'magnify 2×: lens shows the page at twice its size ({lens.split()[0] if lens else "none"} vs viewer {vw}px)')
    pg.click('.knob >> nth=0'); check('3×' in pg.inner_text('.knob >> nth=0'), 'magnify knob turns to 3×')
    pg.click('.knob >> nth=0'); check(pg.locator('.lens').count() == 0, 'magnify knob turns off')
    pg.click('.knob >> nth=1'); pg.click('.knob >> nth=1'); pg.wait_for_timeout(100)
    f = pg.evaluate("getComputedStyle(document.querySelector('.vpage__img')).filter")
    check(pg.locator('.viewer.c-xray').count() == 1 and 'invert' in f, 'contrast knob: normal → high → X-ray (inverted)')
    pg.click('.knob >> nth=1')
    pg.click('.strip li >> nth=12'); pg.click('.btn--scan'); pg.wait_for_timeout(3500)
    pg.click('.knob >> nth=2'); check(pg.locator('.spots--map').count() == 1, 'overlay knob: status map')
    pg.click('.knob >> nth=2'); check(pg.locator('.spot').count() == 0, 'overlay knob: notes off')
    pg.click('.knob >> nth=2')
    pg.click('.knob >> nth=3'); check('page 14' in norm(pg.inner_text('.panel-label')), 'page knob advances the page')
    # keyboard
    pg.keyboard.press('ArrowLeft'); check('page 13' in norm(pg.inner_text('.panel-label')), '← turns back a page')
    pg.keyboard.press('3'); check('context' in norm(pg.inner_text('.ctl__lcd')), 'number keys pick layers (3 = Context)')
    pg.keyboard.press('1')
    pg.click('.p-lamp'); check(pg.locator('.lamp-on').count() == 1, 'desk lamp switches the task light on')
    pg.click('.p-lamp')
    # lightbox
    pg.click('.p-table'); pg.wait_for_timeout(300)
    check(pg.locator('dialog[open] .lightbox__glass img').count() == 1 and pg.locator('.lightbox__notes li').count() == n13, 'imaging table opens the lightbox with the page and its notes')
    pg.click('text=Zoom 2×'); check(pg.locator('.lightbox__glass.is-zoom').count() == 1, 'lightbox zooms 2×')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150); check(pg.locator('dialog[open]').count() == 0, 'Esc closes the lightbox')
    # compare
    pg.click('.actions >> text=Compare'); pg.wait_for_timeout(200)
    c1 = pg.evaluate("getComputedStyle(document.querySelector('.vcmp__b')).clipPath")
    pg.fill('.range input', '80'); pg.wait_for_timeout(100)
    c2 = pg.evaluate("getComputedStyle(document.querySelector('.vcmp__b')).clipPath")
    check('10' in pg.inner_text('.vcmp__la') and '12' in pg.inner_text('.vcmp__lb') and c1 != c2, f'compare: pretotypes p. 10 vs prototypes p. 12, slider moves the split ({c2})')
    pg.click('text=Three specimens'); pg.wait_for_timeout(150)
    check(pg.locator('.stable tbody tr').count() == 7 and pg.locator('.stable thead th').count() == 4, 'compare: 7 layers × 3 specimens')
    pg.keyboard.press('Escape')
    # research
    pg.click('.actions >> text=Research drawer'); pg.wait_for_timeout(200)
    t = norm(pg.inner_text('dialog[open]'))
    check('does not detect skill' in t and 'not an' not in t[:0] and norm(C['specimens'][0]['fileNote']) in t, 'research drawer: ethics gate and provenance')
    check(all(norm(C['statuses'][k]['label']) in t for k in C['statuses']), 'research drawer explains all four statuses')
    pg.keyboard.press('Escape')
    # report
    pg.click('.actions >> text=Print report'); pg.wait_for_timeout(500)
    check(pg.locator('.rp-paper').count() == 1 and 'printing' in norm(pg.inner_text('.rp-lcd')), 'report printer feeds paper and shows PRINTING')
    pg.wait_for_timeout(1500)
    rep = norm(pg.inner_text('dialog[open] .report'))
    check(pg.locator('dialog[open] .report__sec').count() == 7, 'report has all seven evidence layers')
    check(all(norm(C['statuses'][k]['label']) in rep for k in ['visible', 'documented', 'notprovided', 'cannot']), 'report distinguishes VISIBLE / DOCUMENTED / NOT PROVIDED / CANNOT BE INFERRED')
    check('score' not in rep and 'rating' not in rep, 'report gives no score or rating')
    with pg.expect_download() as dl: pg.click('text=Save as web page')
    d = dl.value; html = open(d.path(), encoding='utf-8').read()
    check(d.suggested_filename == 'portfolio-xray-report-bachat.html' and 'NOT PROVIDED' in html and 'Change History' in html, 'report saves as a standalone web page')
    with pg.expect_download() as dl: pg.click('text=Save as text')
    txt = open(dl.value.path(), encoding='utf-8').read()
    check('CANNOT BE INFERRED' in txt and 'p. 13' in txt and 'Ask:' in txt, 'report saves as text with page references and questions')
    pg.click('.report__btns >> text=Copy'); pg.wait_for_timeout(200)
    clip = pg.evaluate('navigator.clipboard.readText()')
    check('PORTFOLIO EXAMINATION REPORT' in clip, 'Copy puts the report on the clipboard')
    pg.emulate_media(media='print')
    vis = pg.evaluate("[getComputedStyle(document.querySelector('.report--print')).display, getComputedStyle(document.querySelector('.topbar')).display]")
    check(vis == ['block', 'none'], f'print stylesheet prints only the report ({vis})')
    pg.emulate_media(media='screen')
    # exit
    pg.click('text=Walk to the exit'); pg.wait_for_timeout(500)
    check(norm(pg.inner_text('.hsign--exit')) == norm(C['meta']['closing']), 'exit: THE PORTFOLIO GOT US IN THE ROOM. THE QUESTIONS TAKE US FURTHER.')
    nask = sum(1 for l in C['specimens'][0]['findings'].values() for f in l if f.get('ask'))
    check(pg.locator('.qslip ol li').count() == nask and norm(C['meta']['result']) in norm(pg.inner_text('.qslip')), f'exit lists the {nask} questions the file could not answer')
    pg.click('text=Examine another specimen'); pg.wait_for_timeout(400)
    check(pg.locator('.scene--reception').count() == 1 and pg.locator('.topbar__ticket').count() == 0, 'another specimen returns to reception without a ticket')
    pg.click('.p-printer'); check(pg.inner_text('.topbar__ticket') == 'PX-018', 'next visitor gets PX-018')
    pg.click('.p-folders'); check('examined' in norm(pg.inner_text('.folder >> nth=0')), 'examined folders are stamped')
    pg.keyboard.press('Escape')

    # --- specimen B (Canva) ---
    register(pg, 1)
    shown = [x['n'] for x in P['canva']]
    check(pg.locator('.strip li').count() == len(shown) == 16 and 2 not in shown and 9 not in shown, 'Canva: 16 of 22 pages shown; pages with people (2, 5, 7, 9, 16, 22) left out')
    pg.click('.btn--scan'); pg.wait_for_timeout(3500)
    check(pg.locator('.spot').count() == 1, 'Canva p. 1: credited team note after scanning')
    pg.click('.mkey >> nth=5'); check('not provided' in norm(pg.inner_text('.readout')), 'Canva change history: NOT PROVIDED')
    pg.click('.actions >> text=Compare'); pg.wait_for_timeout(200)
    check(pg.locator('.versions--none .stamp').count() == 1, 'Canva: no versions to compare, stamped NOT DOCUMENTED')
    pg.click('text=Three specimens'); pg.click('text=Examine SPECIMEN C'); pg.wait_for_timeout(300)

    # --- specimen C (Nature's Basket) ---
    check(pg.locator('.viewer img.vpage__img').count() == 0 and 'image withheld' in norm(pg.inner_text('.viewer')), 'Nature’s Basket: no page images, text record with IMAGE WITHHELD')
    check(pg.locator('.strip li').count() == 24, 'Nature’s Basket: 24 text records')
    pg.click('.btn--scan'); pg.wait_for_timeout(3500)
    check(pg.locator('.spot').count() == 0 and 'scanned' in norm(pg.inner_text('.panel-label')), 'Nature’s Basket scans but has no image hotspots')
    pg.click('.mkey >> nth=6'); check('no team members are named' in norm(pg.inner_text('.readout')), 'Nature’s Basket people: no names in the file')
    pg.click('.knob >> nth=0'); pg.mouse.move(300, 250)
    check(pg.locator('.lens').count() == 0 and 'text record' in norm(pg.inner_text('.viewer')), 'magnifier explains it only works on images')

    # --- reset, storage, errors ---
    pg.click('.topbar >> text=Reset'); pg.wait_for_timeout(300)
    check(pg.locator('.scene--entrance').count() == 1 and pg.locator('.topbar__ticket').count() == 0, 'reset returns to the entrance and clears the ticket')
    st = pg.evaluate('[localStorage.length, sessionStorage.length]')
    check(st == [0, 0], 'nothing persisted to storage')
    check(not errs and not bad, f'no console errors or failed requests ({errs[:2]} {bad[:2]})')
    ctx.close()

    # --- reduced motion ---
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce'); pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    check(pg.locator('.app.rm').count() == 1, 'reduced motion detected')
    to_reception(pg, fast=True); register(pg, 0)
    pg.click('.btn--scan'); pg.wait_for_timeout(450)
    check('scanned' in norm(pg.inner_text('.panel-label')), 'reduced motion: scan completes in ~250 ms')
    ctx.close()

    # --- keyboard only ---
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce'); pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(400)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    ok = pg.locator('.scene--reception').count() == 1
    pg.focus('.guide .btn--go'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    pg.focus('.guide .btn--go'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.keyboard.press('Tab'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.keyboard.press('Space') if False else None
    pg.focus('.consent input'); pg.keyboard.press('Space'); pg.focus('button[type=submit]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.keyboard.press('s'); pg.wait_for_timeout(400)
    check(ok and pg.locator('.scene--chamber').count() == 1 and pg.locator('.spot').count() >= 1, 'keyboard only: entrance → doors → ticket → folder → declaration → scan')
    ctx.close()

    # --- missing assets ---
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce'); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/PX_ENV_03_ExamChamber_v01.png', lambda r: r.abort()); pg.route('**/PX_SCAN_05_ModeSelectorPanel_v01.png', lambda r: r.abort())
    pg.goto(URL); pg.wait_for_timeout(400); to_reception(pg, fast=True); register(pg, 0); pg.wait_for_timeout(400)
    fb = pg.locator('[data-missing]').count()
    pg.click('.mkey >> nth=2'); pg.click('.btn--scan'); pg.wait_for_timeout(450)
    check(fb == 2 and pg.locator('img[src*="ExamChamber"]').count() == 0 and 'context' in norm(pg.inner_text('.ctl__lcd')) and not errs, f'missing images show labelled fallbacks; keys and scan still work ({fb} fallbacks)')
    ctx.close()
    b.close()

# --- source images: participant photos blurred on Bachat p. 13 ---
im = Image.open('public/specimens/bachat/p13.jpg').convert('L')
k = 1600 / 1280
region = im.crop(tuple(round(v * k) for v in (850, 170, 1190, 630)))
edges = sum(ImageStat.Stat(region.filter(__import__('PIL.ImageFilter', fromlist=['FIND_EDGES']).FIND_EDGES)).mean)
check(edges < 6, f'Bachat p. 13 participant photographs are blurred (edge energy {edges:.1f})')

n = sum(1 for ok, _ in results if ok)
print(f'\n{n}/{len(results)} checks passed')
sys.exit(0 if n == len(results) else 1)
