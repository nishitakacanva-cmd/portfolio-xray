import { useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { AssetImage } from './AssetImage';
import { DISCLAIMERS, LAYERS, META, SOURCES, SPECIMENS, STATUSES, STATUS_ORDER, counts, specimenById, viewPages, type Finding, type Specimen, type Status } from '../data/content';
import type { Action, State } from '../state';

export function Modal({ open, onClose, label, className = '', children }: { open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; if (open && !el.open) el.showModal(); if (!open && el.open) el.close(); }, [open]);
  return (
    <dialog ref={ref} className={'modal ' + className} aria-label={label} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
      {open && children}
    </dialog>
  );
}
const X = ({ onClick }: { onClick: () => void }) => <button type="button" className="xbtn" onClick={onClick} aria-label="Close">×</button>;

export function StatusChip({ s, n }: { s: Status; n?: number }) {
  return <span className={'stchip st-' + s} title={STATUSES[s].desc}>{STATUSES[s].label}{n !== undefined && <b>{n}</b>}</span>;
}

/** Findings with status, page links and the question to ask when the file is silent. */
export function FindingList({ sp, list, d }: { sp: Specimen; list: Finding[]; d?: Dispatch<Action> }) {
  const shown = new Set(viewPages(sp).map(p => p.n));
  return (
    <ul className="flist">
      {list.map((f, i) => (
        <li key={i} className={'st-' + f.s}>
          <StatusChip s={f.s} />
          <p>{f.t}
            {f.p.length > 0 && <span className="flist__pp">{f.p.map(n => d && shown.has(n)
              ? <button key={n} type="button" className="pagelink mono" onClick={() => d({ t: 'goto', n })}>p. {n}</button>
              : <span key={n} className="pagelink mono is-off" title={shown.has(n) ? '' : 'Page not shown in this exhibit'}>p. {n}</span>)}</span>}
          </p>
          {f.ask && <p className="flist__ask"><b>Ask:</b> {f.ask}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ---------- WHAT ARE WE EXAMINING TODAY? the three folders ---------- */
export function Folders({ s, d }: { s: State; d: Dispatch<Action> }) {
  return (
    <div className="sheet sheet--folders">
      <X onClick={() => d({ t: 'panel', p: null })} />
      <span className="mono sheet__tag">{META.unit} · TICKET PX-0{s.ticket}</span>
      <h2>{META.question}</h2>
      <p className="muted">Three real student projects are on file. Pick one folder; you can come back for another.</p>
      <ul className="folders">
        {SPECIMENS.map(x => (
          <li key={x.id}>
            <button type="button" className={'folder' + (s.specimen === x.id ? ' is-sel' : '')} onClick={() => d({ t: 'pick', id: x.id })} aria-label={`${x.code}: ${x.title}. ${x.subtitle}.${x.recommended ? ' Most documented process.' : ''}${x.images ? '' : ' Images withheld; text record.'}`}>
              <AssetImage k="PX_FORM_02_SpecimenFolderCover_v01" alt="" />
              <span className="folder__tab mono">{x.code}</span>
              <span className="folder__title">{x.title}</span>
              <span className="folder__f folder__f--v">{x.folder.visible}</span>
              <span className="folder__f folder__f--c">{x.folder.context}</span>
              <span className="folder__f folder__f--h">{x.folder.change.map(c => <i key={c}>{c}</i>)}</span>
              {x.recommended && <span className="folder__flag mono">MOST DOCUMENTED</span>}
              {!x.images && <span className="folder__flag folder__flag--w mono">IMAGES WITHHELD</span>}
              {s.examined[x.id] && <span className="folder__seen mono">EXAMINED</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- registration form on the clipboard (PX_FORM_01 + live fields) ---------- */
export function Register({ s, d }: { s: State; d: Dispatch<Action> }) {
  const sp = specimenById(s.specimen); if (!sp) return null;
  return (
    <form className="sheet sheet--register" onSubmit={e => { e.preventDefault(); d({ t: 'register' }); }}>
      <X onClick={() => d({ t: 'panel', p: null })} />
      <div className="regform">
        <AssetImage k="PX_FORM_01_RegistrationForm_v01" className="regform__img" alt="" label="Registration form" />
        <span className="rf rf--vis hand">{sp.title}: {sp.folder.visible}</span>
        <span className="rf rf--ctx hand">{sp.course}<br />{sp.pageCount} pages · {sp.images ? 'images shown' : 'images withheld'}</span>
        <span className="rf rf--ppl hand">{sp.credited.length ? sp.credited.join(', ') + ` (as credited, p. ${sp.creditPage})` : 'No names in the file.'}</span>
      </div>
      <div className="regside">
        <span className="mono sheet__tag">REGISTRATION · TICKET PX-0{s.ticket}</span>
        <h2>{sp.code}: {sp.title}</h2>
        <dl className="kv">
          <dt>Source file</dt><dd className="mono">{sp.file}</dd>
          <dt>About</dt><dd>{sp.subtitle}</dd>
          {sp.fileNote && <><dt>Provenance</dt><dd>{sp.fileNote}</dd></>}
          {sp.omitted && <><dt>Not shown</dt><dd>{sp.omitted}</dd></>}
          {sp.withheld && <><dt>Images</dt><dd>{sp.withheld}</dd></>}
        </dl>
        <label className="consent"><input type="checkbox" checked={s.consent} onChange={e => d({ t: 'consent', v: e.target.checked })} /> <span>{META.consent}</span></label>
        <div className="row"><button type="submit" className="btn btn--go" disabled={!s.consent}>Proceed to imaging →</button><button type="button" className="btn btn--ghost" onClick={() => d({ t: 'panel', p: 'folders' })}>Choose another folder</button></div>
      </div>
    </form>
  );
}

/* ---------- lightbox (the imaging table) ---------- */
export function Lightbox({ s, d }: { s: State; d: Dispatch<Action> }) {
  const sp = specimenById(s.specimen)!; const pages = viewPages(sp); const vp = pages[s.page];
  const [zoom, setZoom] = useState(false);
  const spots = sp.hotspots.map((h, i) => ({ h, i })).filter(x => x.h.page === vp?.n);
  return (
    <div className="lightbox">
      <div className="lightbox__bar">
        <span className="mono">LIGHTBOX · {sp.code} · PAGE {vp?.n} OF {sp.pageCount}</span>
        <div className="row">
          <button type="button" className="btn btn--sm" onClick={() => d({ t: 'page', i: s.page - 1 })} aria-label="Previous page">‹ Prev</button>
          <button type="button" className="btn btn--sm" onClick={() => d({ t: 'page', i: s.page + 1 })} aria-label="Next page">Next ›</button>
          {vp?.img && <button type="button" className="btn btn--sm" aria-pressed={zoom} onClick={() => setZoom(z => !z)}>{zoom ? 'Fit to screen' : 'Zoom 2×'}</button>}
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => d({ t: 'panel', p: null })}>Close</button>
        </div>
      </div>
      <div className={'lightbox__glass' + (zoom ? ' is-zoom' : '')} tabIndex={0} aria-label="Page on the light table">
        {vp?.img ? <img src={vp.img.src} alt={`${sp.title}, page ${vp.n}`} /> : <div className="vpage__text vpage__text--lb"><span className="stamp mono">IMAGE WITHHELD</span><b className="mono">PAGE {vp?.n}</b><p>{vp?.text}</p></div>}
      </div>
      {spots.length > 0 && (
        <ol className="lightbox__notes">{spots.map(({ h, i }, k) => <li key={i}><button type="button" className="linkbtn" onClick={() => { d({ t: 'hotspot', i }); d({ t: 'panel', p: null }); }}><span className="mono">{k + 1}</span> <StatusChip s={h.s} /> {h.title}</button></li>)}</ol>
      )}
    </div>
  );
}

/* ---------- compare: process versions, and the three specimens ---------- */
export function Compare({ s, d }: { s: State; d: Dispatch<Action> }) {
  const sp = specimenById(s.specimen)!;
  const pages = viewPages(sp);
  const v = sp.versions;
  const img = (n: number) => pages.find(p => p.n === n)?.img?.src;
  return (
    <div className="sheet sheet--compare">
      <X onClick={() => d({ t: 'panel', p: null })} />
      <div role="tablist" className="tabs" aria-label="Compare">
        <button role="tab" type="button" aria-selected={s.compareTab === 'versions'} onClick={() => d({ t: 'compareTab', v: 'versions' })}>Process versions</button>
        <button role="tab" type="button" aria-selected={s.compareTab === 'specimens'} onClick={() => d({ t: 'compareTab', v: 'specimens' })}>Three specimens</button>
      </div>
      {s.compareTab === 'versions' ? (
        v ? (
          <div className="versions">
            <div className="vcmp" style={{ ['--split' as string]: s.split + '%' }}>
              <img src={img(v.a.page)} alt={`${sp.title}, page ${v.a.page}`} />
              <div className="vcmp__b"><img src={img(v.b.page)} alt={`${sp.title}, page ${v.b.page}`} /></div>
              <span className="vcmp__la mono">{v.a.label}</span><span className="vcmp__lb mono">{v.b.label}</span>
              <span className="vcmp__edge" aria-hidden="true" />
            </div>
            <label className="range"><span className="mono">{v.a.label}</span><input type="range" min={0} max={100} value={s.split} onChange={e => d({ t: 'split', v: +e.target.value })} aria-label="Slide between the two versions" aria-valuetext={`${100 - s.split}% ${v.a.label}, ${s.split}% ${v.b.label}`} /><span className="mono">{v.b.label}</span></label>
            <p>{v.note}</p>
            <FindingList sp={sp} list={sp.findings.change} d={d} />
          </div>
        ) : (
          <div className="versions versions--none"><span className="stamp mono">NOT DOCUMENTED</span><p>{sp.title} has no earlier versions, drafts or iterations in the file, so there is nothing to compare. That doesn’t mean there weren’t any.</p><FindingList sp={sp} list={sp.findings.change} /></div>
        )
      ) : (
        <div className="specs">
          <table className="stable">
            <thead><tr><th scope="col">Layer</th>{SPECIMENS.map(x => <th key={x.id} scope="col" className={x.id === sp.id ? 'is-cur' : ''}><span className="mono">{x.code}</span><br />{x.title}</th>)}</tr></thead>
            <tbody>
              {LAYERS.map(l => (
                <tr key={l.id}><th scope="row">{l.label}</th>
                  {SPECIMENS.map(x => { const c = counts(x, l.id); return <td key={x.id} className={x.id === sp.id ? 'is-cur' : ''}>{STATUS_ORDER.filter(k => c[k]).map(k => <StatusChip key={k} s={k} n={c[k]} />)}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Counts are findings per layer, by status. They describe the documents, not the quality of the work or the people.</p>
          <div className="row">{SPECIMENS.filter(x => x.id !== sp.id).map(x => <button key={x.id} type="button" className="btn" onClick={() => d({ t: 'switchSpecimen', id: x.id })}>Examine {x.code}: {x.title}</button>)}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- research drawer ---------- */
export function Research({ s, d }: { s: State; d: Dispatch<Action> }) {
  const sp = specimenById(s.specimen);
  return (
    <div className="sheet sheet--research">
      <X onClick={() => d({ t: 'panel', p: null })} />
      <span className="mono sheet__tag">RESEARCH DRAWER</span>
      <h2>What the unit can and can’t tell you</h2>
      <p className="ethics">{META.ethics}</p>
      <h3>The four statuses</h3>
      <ul className="slegend">{STATUS_ORDER.map(k => <li key={k}><StatusChip s={k} /> {STATUSES[k].desc}</li>)}</ul>
      <h3>Provenance{sp ? `: ${sp.code}` : ''}</h3>
      {SPECIMENS.filter(x => !sp || x.id === sp.id).map(x => (
        <dl key={x.id} className="kv">
          <dt>Specimen</dt><dd>{x.code}: {x.title}</dd>
          <dt>Source file</dt><dd className="mono">{x.file}</dd>
          <dt>Pages</dt><dd>{x.pageCount}{x.images ? `; ${viewPages(x).length} shown` : '; text record only'}</dd>
          <dt>Credited</dt><dd>{x.credited.length ? `${x.credited.join(', ')} (p. ${x.creditPage})` : 'No names in the file'}</dd>
          {x.fileNote && <><dt>Note</dt><dd>{x.fileNote}</dd></>}
          {x.spelling && <><dt>Spelling</dt><dd>{x.spelling}</dd></>}
          {x.omitted && <><dt>Not shown</dt><dd>{x.omitted}</dd></>}
          {x.withheld && <><dt>Images</dt><dd>{x.withheld}</dd></>}
        </dl>
      ))}
      <h3>Sources</h3>
      <ul className="disc"><li>{SOURCES.files}</li><li>{SOURCES.sb}</li></ul>
      <h3>Read this before quoting the unit</h3>
      <ul className="disc">{DISCLAIMERS.map(t => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

/* ---------- the examination report ---------- */
export function reportText(sp: Specimen): string {
  const L: string[] = [META.department, 'PORTFOLIO EXAMINATION REPORT', '', `${sp.code}: ${sp.title}`, sp.subtitle, `Source: ${sp.file} (${sp.pageCount} pages)`,
    `Credited: ${sp.credited.length ? sp.credited.join(', ') + ` (p. ${sp.creditPage})` : 'no names in the file'}`, ''];
  for (const l of LAYERS) {
    L.push(`${l.key - 1}. ${l.label.toUpperCase()}: ${l.question}`);
    for (const f of sp.findings[l.id]) {
      L.push(`   [${STATUSES[f.s].label}] ${f.t}${f.p.length ? ` (p. ${f.p.join(', ')})` : ''}`);
      if (f.ask) L.push(`      Ask: ${f.ask}`);
    }
    L.push('');
  }
  L.push(META.result, META.closing, '', 'STATUS KEY');
  for (const k of STATUS_ORDER) L.push(`  ${STATUSES[k].label}: ${STATUSES[k].desc}`);
  L.push('', ...DISCLAIMERS, '', META.attribution);
  return L.join('\n');
}
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function reportHTML(sp: Specimen): string {
  const col: Record<Status, string> = { visible: '#1f6f7a', documented: '#2c6b3f', notprovided: '#9a6a12', cannot: '#8a3434' };
  const rows = LAYERS.map(l => `<section><h2>${l.key - 1}. ${esc(l.label)} <small>${esc(l.question)}</small></h2><ul>${sp.findings[l.id].map(f => `<li><b style="color:${col[f.s]}">${STATUSES[f.s].label}</b> ${esc(f.t)}${f.p.length ? ` <i>(p. ${f.p.join(', ')})</i>` : ''}${f.ask ? `<br><span class="ask">Ask: ${esc(f.ask)}</span>` : ''}</li>`).join('')}</ul></section>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Portfolio examination report · ${esc(sp.title)}</title><style>body{font:14px/1.45 system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 20px;color:#1d2a2c}h1{font-size:24px;margin:0}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #c8d2d0;padding-bottom:4px}h2 small{font-weight:400;color:#5b6b6c}ul{padding-left:18px}li{margin:4px 0}.ask{color:#5b6b6c}.k{font:12px monospace;letter-spacing:.08em;color:#5b6b6c}.fine{font-size:12px;color:#5b6b6c}</style>
<p class="k">${esc(META.department)} · ${esc(META.unit)}</p><h1>Portfolio examination report</h1><p><b>${esc(sp.code)}: ${esc(sp.title)}</b><br>${esc(sp.subtitle)}<br>Source: ${esc(sp.file)} (${sp.pageCount} pages)<br>Credited: ${esc(sp.credited.length ? sp.credited.join(', ') + ` (p. ${sp.creditPage})` : 'no names in the file')}</p>${rows}
<p><b>${esc(META.result)}</b><br><b>${esc(META.closing)}</b></p><p class="fine">${STATUS_ORDER.map(k => `<b>${STATUSES[k].label}</b>: ${esc(STATUSES[k].desc)}`).join('<br>')}</p><p class="fine">${DISCLAIMERS.map(esc).join('<br>')}</p><p class="fine">${esc(META.attribution)}</p></html>`;
}
export function saveReport(sp: Specimen, kind: 'txt' | 'html'): string {
  const body = kind === 'txt' ? reportText(sp) : reportHTML(sp);
  const url = URL.createObjectURL(new Blob([body], { type: kind === 'txt' ? 'text/plain' : 'text/html' }));
  const a = document.createElement('a'); a.href = url; a.download = `portfolio-xray-report-${sp.id}.${kind}`; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return window.self !== window.top ? 'Saved. If nothing downloaded, this preview blocks downloads; use Copy.' : `Saved portfolio-xray-report-${sp.id}.${kind}.`;
}

export function Report({ s, d, printOnly = false }: { s: State; d: Dispatch<Action>; printOnly?: boolean }) {
  const sp = specimenById(s.specimen)!;
  const [msg, setMsg] = useState('');
  const c = counts(sp);
  const copy = async () => {
    const t = reportText(sp);
    try { await navigator.clipboard.writeText(t); setMsg('Copied to the clipboard.'); }
    catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); setMsg(ok ? 'Copied to the clipboard.' : 'Copy was blocked here. Use Save instead.'); }
  };
  return (
    <article className={'report' + (printOnly ? ' report--print' : '')} aria-hidden={printOnly || undefined}>
      {!printOnly && <X onClick={() => d({ t: 'panel', p: null })} />}
      <AssetImage k="PX_FORM_03_ExaminationReport_v01__header" className="report__head" alt="Portfolio examination report. Department of Invisible Work." />
      <div className="report__meta">
        <p><b>{sp.code}: {sp.title}</b><br />{sp.subtitle}</p>
        <p className="mono">SOURCE · {sp.file} · {sp.pageCount} PP.<br />CREDITED · {sp.credited.length ? sp.credited.join(', ').toUpperCase() : 'NO NAMES IN THE FILE'}</p>
        <p className="report__tot">{STATUS_ORDER.map(k => <StatusChip key={k} s={k} n={c[k]} />)}</p>
      </div>
      {LAYERS.map(l => (
        <section key={l.id} className="report__sec">
          <h3><span className="mono">{l.key - 1}</span> {l.label}<small>{l.question}</small></h3>
          <FindingList sp={sp} list={sp.findings[l.id]} />
        </section>
      ))}
      <p className="report__close"><b>{META.result}</b><br />{META.closing}</p>
      <ul className="report__fine">{DISCLAIMERS.map(t => <li key={t}>{t}</li>)}</ul>
      {!printOnly && (
        <div className="report__btns">
          <button type="button" className="btn" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn" onClick={() => setMsg(saveReport(sp, 'html'))}>Save as web page</button>
          <button type="button" className="btn" onClick={() => setMsg(saveReport(sp, 'txt'))}>Save as text</button>
          <button type="button" className="btn" onClick={copy}>Copy</button>
          <button type="button" className="btn btn--go" onClick={() => d({ t: 'exit' })} autoFocus>Walk to the exit →</button>
          <p className="report__msg" role="status">{msg}</p>
        </div>
      )}
    </article>
  );
}
