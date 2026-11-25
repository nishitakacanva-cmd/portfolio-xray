"""Viewport + touch QA for PORTFOLIO X-RAY. Serve dist/ on :8768 first.
Each run: entrance → doors → ticket → folder → declaration → scan p. 13 → note → report → exit."""
import asyncio
from playwright.async_api import async_playwright
URL = 'http://localhost:8768/'

async def act(pg, sel, touch):
    el = pg.locator(sel).first; await el.scroll_into_view_if_needed()
    if touch: await el.tap()
    else: await el.click()

async def run(b, w, h, tag, touch=False):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch and w < 800)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto(URL); await pg.wait_for_timeout(800)
    mode = (await pg.evaluate("document.querySelector('.app').className")).split()[1]
    await pg.screenshot(path=f'/tmp/px/v-{tag}-0.png')
    await act(pg, 'text=Walk to the doors', touch); await pg.wait_for_timeout(1400)
    await act(pg, 'text=Push the doors', touch); await pg.wait_for_timeout(1600)
    await act(pg, '.guide .btn--go', touch); await pg.wait_for_timeout(300)
    await act(pg, '.guide .btn--go', touch); await pg.wait_for_timeout(300)
    await act(pg, '.folder >> nth=0', touch); await pg.wait_for_timeout(300)
    await act(pg, '.consent input', touch); await act(pg, 'button[type=submit]', touch); await pg.wait_for_timeout(500)
    await act(pg, '.strip li >> nth=12', touch); await pg.wait_for_timeout(200)
    await act(pg, '.btn--scan', touch); await pg.wait_for_timeout(1600)
    await pg.evaluate('window.scrollTo(0,0)')
    await pg.screenshot(path=f'/tmp/px/v-{tag}-1.png', full_page=(mode == 'mode-stack'))
    await pg.wait_for_timeout(2000)
    spots = await pg.locator('.spot').count()
    await act(pg, '.spot >> nth=2', touch); await pg.wait_for_timeout(200)
    note = 'privacy' in (await pg.inner_text('.readout')).lower()
    await pg.evaluate('window.scrollTo(0,0)')
    await pg.screenshot(path=f'/tmp/px/v-{tag}-2.png', full_page=(mode == 'mode-stack'))
    small = await pg.evaluate("""[...document.querySelectorAll('.actions button, .topbar button, .strip__arr, .mkey, .knob, .readout button')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect()).filter(r=>r.height<30||r.width<28).map(r=>Math.round(r.width)+'x'+Math.round(r.height))""")
    await act(pg, '.actions .btn--go', touch); await pg.wait_for_timeout(2000)
    rep = await pg.locator('dialog[open] .report__sec').count()
    await pg.screenshot(path=f'/tmp/px/v-{tag}-3.png')
    await act(pg, 'text=Walk to the exit', touch); await pg.wait_for_timeout(700)
    ex = await pg.locator('.qslip ol li').count()
    await pg.screenshot(path=f'/tmp/px/v-{tag}-4.png')
    ov = await pg.evaluate('document.documentElement.scrollWidth-innerWidth')
    print(f'{tag:6} {mode:11} spots={spots} note={note} report_sections={rep} exit_questions={ex} hOverflow={ov} smallTargets={small if touch else "n/a (mouse)"} errs={errs}')
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        await run(b, 1920, 1080, '1920'); await run(b, 1440, 900, '1440'); await run(b, 1366, 768, '1366')
        await run(b, 1024, 768, 'tabL', True); await run(b, 768, 1024, 'tabP', True); await run(b, 390, 844, 'phone', True)
        await b.close()
asyncio.run(main())
