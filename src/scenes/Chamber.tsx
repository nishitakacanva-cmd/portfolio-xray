import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AssetImage } from '../components/AssetImage';
import { asset } from '../data/assets';
import { LAYERS, STATUSES, counts, layerById, specimenById, viewPages, type Hotspot, type Specimen, type ViewPage } from '../data/content';
import { pageKey, type Action, type Mode, type State } from '../state';
import type { SceneProps } from '../App';
import { FindingList, StatusChip } from '../components/Panels';

export const SCAN_MS = 3200, SCAN_MS_REDUCED = 250;
const LENS_R = 90; // inner radius of the lens (190px − 2×5px border) / 2

/** Mode-selector keys measured on PX_SCAN_05 (557×326): key 1 = all layers, keys 2–8 = the seven layers, key 9 = scan. */
const KEYS = [[140, 185], [185, 177], [230, 168], [270, 158], [310, 149], [345, 138], [380, 128], [425, 112], [460, 100]];
/** Knob centres measured on PX_SCAN_04 (546×310). */
const KNOBS = [[125, 95], [215, 128], [305, 155], [405, 185]];
const PL = {
  modes: { k: 'PX_SCAN_05_ModeSelectorPanel_v01', x: 800, y: 6, s: 0.88 },
  knobs: { k: 'PX_SCAN_04_ControlKnobCluster_v01', x: 784, y: 300, s: 0.72 },
  lamp: { k: 'PX_PROP_03_DeskLamp_v01', x: 790, y: 592, s: 0.42 },
  table: { k: 'PX_SCAN_01_ImagingTableLightbox_v01', x: 914, y: 560, s: 0.3 },
  printer: { k: 'PX_SCAN_06_ReportPrinter_v01', x: 1092, y: 590, s: 0.46 }
} as const;
type PK = keyof typeof PL;
const pbox = (k: PK): CSSProperties => { const a = asset(PL[k].k); return { left: PL[k].x, top: PL[k].y, width: a.w * PL[k].s, height: a.h * PL[k].s }; };

const mag = (s: State) => (s.magnify ? `${s.magnify}×` : 'OFF');
const con = (s: State) => (s.contrast === 'xray' ? 'X-RAY' : s.contrast === 'high' ? 'HIGH' : 'NORMAL');
const ovl = (s: State) => (s.overlay === 'map' ? 'MAP' : s.overlay === 'off' ? 'OFF' : 'NOTES');

export function Chamber({ s, d, mode, reduced }: SceneProps) {
  const sp = specimenById(s.specimen)!;
  const pages = viewPages(sp);
  const vp = pages[s.page];
  const pk = pageKey(s);
  const scanned = !!s.scanned[pk];

  // Keyboard: ←/→ pages, S scan/pause, M magnify, C contrast, O overlay, L lightbox, 1–8 layers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (s.panel || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement; if (el.closest('input, textarea, select, dialog')) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright') { e.preventDefault(); d({ t: 'page', i: s.page + 1 }); }
      else if (k === 'arrowleft') { e.preventDefault(); d({ t: 'page', i: s.page - 1 }); }
      else if (k === 's') d({ t: 'scan' });
      else if (k === 'm') d({ t: 'magnify' });
      else if (k === 'c') d({ t: 'contrast' });
      else if (k === 'o') d({ t: 'overlay' });
      else if (k === 'l') d({ t: 'panel', p: 'lightbox' });
      else if (k === '1') d({ t: 'mode', m: 'all' });
      else if (/^[2-8]$/.test(k)) d({ t: 'mode', m: LAYERS[+k - 2].id });
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [s.panel, s.page, d]);

  const actions = (
    <div className="actions" role="group" aria-label="Imaging controls">
      <button type="button" className={'btn btn--scan' + (s.scan ? ' is-running' : '')} onClick={() => d({ t: 'scan' })} aria-pressed={!!s.scan && !s.scan.paused}>
        {!s.scan ? (scanned ? '↻ Rescan page' : '▶ Scan page') : s.scan.paused ? '▶ Resume scan' : '❚❚ Pause scan'}
      </button>
      <button type="button" className="btn" onClick={() => d({ t: 'panel', p: 'lightbox' })}>Lightbox</button>
      <button type="button" className="btn" onClick={() => d({ t: 'panel', p: 'compare' })}>Compare</button>
      <button type="button" className="btn" onClick={() => d({ t: 'panel', p: 'research' })}>Research drawer</button>
      <button type="button" className="btn btn--go" onClick={() => d({ t: 'print' })} disabled={s.printing}>{s.printing ? 'Printing…' : 'Print report'}</button>
    </div>
  );
  const header = (
    <p className="panel-label mono">IMAGING PANEL · {sp.code} · {sp.title.toUpperCase()} · PAGE {vp?.n ?? '—'} OF {sp.pageCount}
      <span className={'panel-label__st' + (scanned ? ' is-ok' : '')}>{s.scan ? (s.scan.paused ? 'PAUSED' : 'SCANNING') : scanned ? 'SCANNED' : 'NOT SCANNED'}</span></p>
  );
  const viewer = <Viewer s={s} d={d} sp={sp} vp={vp} scanned={scanned} reduced={reduced} />;
  const strip = <Strip s={s} d={d} sp={sp} pages={pages} />;
  const readout = <Readout s={s} d={d} sp={sp} />;
  const controls = <Controls s={s} d={d} stage={mode === 'stage'} />;

  if (mode === 'stack') {
    return (
      <section className="sk-scene sk-chamber">
        {header}{viewer}{strip}{actions}{readout}
        <div className="sk-controls">{controls}</div>
      </section>
    );
  }
  return (
    <div className={'scene scene--chamber' + (s.lamp ? ' lamp-on' : '')}>
      <AssetImage k="PX_ENV_03_ExamChamber_v01" className="env" alt="" label="Examination chamber" />
      <div className="chamber__left">{header}{viewer}{strip}<div className="chamber__readout">{actions}{readout}</div></div>
      {controls}
    </div>
  );
}

/* ---------- the imaging panel: page, scan beam, arm, hotspots, magnifier ---------- */
function Viewer({ s, d, sp, vp, scanned, reduced }: { s: State; d: React.Dispatch<Action>; sp: Specimen; vp: ViewPage | undefined; scanned: boolean; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  // Page box in CSS px (unscaled), so the lens enlarges the page by exactly `magnify`.
  const box = { w: ref.current?.clientWidth ?? 720, h: ref.current?.clientHeight ?? 400 };
  const spots = sp.hotspots.map((h, i) => ({ h, i })).filter(x => vp && x.h.page === vp.n && (s.mode === 'all' || x.h.layer === s.mode));
  const showSpots = scanned && s.overlay !== 'off' && !s.scan;
  const dur = reduced ? SCAN_MS_REDUCED : SCAN_MS;
  const move = (e: React.PointerEvent) => {
    if (!s.magnify || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setLens({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };
  const sel = s.hotspot !== null ? sp.hotspots[s.hotspot] : null;
  useEffect(() => { if (!s.magnify) setLens(null); }, [s.magnify]);
  useEffect(() => { if (s.magnify && sel && vp && sel.page === vp.n) setLens({ x: (sel.x + sel.w / 2) / 100, y: (sel.y + sel.h / 2) / 100 }); }, [s.magnify, sel, vp]);
  const page = vp?.img ? (
    <img className="vpage__img" src={vp.img.src} alt={`${sp.title}, page ${vp.n}`} draggable={false} />
  ) : vp ? (
    <div className="vpage__text"><span className="stamp mono">IMAGE WITHHELD</span><b className="mono">PAGE {vp.n} · TEXT RECORD</b><p>{vp.text}</p><small>{sp.withheld}</small></div>
  ) : null;
  return (
    <div className={'viewer c-' + s.contrast + (s.magnify ? ' is-mag' : '')} ref={ref} onPointerMove={move} onPointerLeave={() => s.magnify && setLens(null)}>
      <div className="vpage">{page}</div>
      {vp?.img?.note && <span className="vpage__note mono">{vp.img.note}</span>}
      {s.scan && (
        <div className={'scanfx' + (s.scan.paused ? ' is-paused' : '')} key={s.scan.key} style={{ ['--dur' as string]: dur + 'ms' }} onAnimationEnd={e => { if (e.animationName === 'sweepW') d({ t: 'scanDone' }); }} aria-hidden="true">
          <div className="scanfx__reveal"><div className="vpage vpage--x">{page}</div></div>
          <span className="scanfx__beam" />
          <div className="arm"><AssetImage k="PX_SCAN_02_ScanningArm_v01" alt="" /></div>
        </div>
      )}
      {s.magnify > 0 && vp && !vp.img && <p className="viewer__hint viewer__hint--top mono">The magnifier works on page images. This page is a text record.</p>}
      {!scanned && !s.scan && <p className="viewer__hint mono">Press SCAN to examine this page{sp.hotspots.length ? '. Notes appear after the scan.' : '.'}</p>}
      {showSpots && (
        <div className={'spots spots--' + s.overlay} aria-label="Notes on this page">
          {spots.map(({ h, i }, k) => (
            <button key={i} type="button" className={'spot st-' + h.s + (s.hotspot === i ? ' is-sel' : '')} style={{ left: h.x + '%', top: h.y + '%', width: h.w + '%', height: h.h + '%' }}
              onClick={() => d({ t: 'hotspot', i: s.hotspot === i ? null : i })} aria-pressed={s.hotspot === i}
              aria-label={`Note ${k + 1}: ${h.title}. ${STATUSES[h.s].label}. ${layerById(h.layer).label}.`}>
              {s.overlay === 'notes' && <span className="spot__tag mono">{k + 1}</span>}
            </button>
          ))}
        </div>
      )}
      {s.magnify > 0 && lens && vp?.img && (
        <span className={'lens c-' + s.contrast} aria-hidden="true" style={{
          left: `${lens.x * 100}%`, top: `${lens.y * 100}%`,
          backgroundImage: `url(${vp.img.src})`,
          backgroundSize: `${box.w * s.magnify}px ${box.h * s.magnify}px`,
          backgroundPosition: `${LENS_R - lens.x * box.w * s.magnify}px ${LENS_R - lens.y * box.h * s.magnify}px`
        }} />
      )}
    </div>
  );
}

function Strip({ s, d, sp, pages }: { s: State; d: React.Dispatch<Action>; sp: Specimen; pages: ViewPage[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => { ref.current?.querySelector('.is-here')?.scrollIntoView({ block: 'nearest', inline: 'center' }); }, [s.page]);
  return (
    <div className="strip">
      <button type="button" className="strip__arr" onClick={() => d({ t: 'page', i: s.page - 1 })} aria-label="Previous page">‹</button>
      <ol ref={ref} aria-label="Pages">
        {pages.map((p, i) => {
          const done = !!s.scanned[`${sp.id}:${p.n}`]; const n = sp.hotspots.filter(h => h.page === p.n).length;
          return (
            <li key={p.n}>
              <button type="button" className={(i === s.page ? 'is-here' : '') + (done ? ' is-done' : '')} onClick={() => d({ t: 'page', i })} aria-current={i === s.page ? 'page' : undefined}
                aria-label={`Page ${p.n}${done ? ', scanned' : ''}${n ? `, ${n} notes` : ''}`}>
                {p.img ? <img src={p.img.thumb} alt="" draggable={false} /> : <span className="strip__txt">{p.text}</span>}
                <i className="mono">{p.n}</i>{n > 0 && <b className="strip__n">{n}</b>}
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" className="strip__arr" onClick={() => d({ t: 'page', i: s.page + 1 })} aria-label="Next page">›</button>
    </div>
  );
}

/* ---------- readout: the selected note, or the current layer's findings ---------- */
function Readout({ s, d, sp }: { s: State; d: React.Dispatch<Action>; sp: Specimen }) {
  const h: Hotspot | null = s.hotspot !== null ? sp.hotspots[s.hotspot] : null;
  if (h) {
    return (
      <div className="readout" aria-live="polite">
        <div className="readout__head"><span className="mono">NOTE · {layerById(h.layer).label.toUpperCase()} · PAGE {h.page}</span><button type="button" className="btn btn--sm btn--ghost" onClick={() => d({ t: 'hotspot', i: null })}>Back to the layer</button></div>
        <h3><StatusChip s={h.s} /> {h.title}</h3>
        <p>{h.note}</p>
        <p className="readout__src mono">SOURCE · {sp.file} · p. {h.page}</p>
      </div>
    );
  }
  if (s.mode === 'all') {
    return (
      <div className="readout">
        <div className="readout__head"><span className="mono">ALL LAYERS · {sp.code}</span><span className="muted">Pick a layer on the mode selector, or a row below.</span></div>
        <table className="ltable">
          <tbody>
            {LAYERS.map(l => { const c = counts(sp, l.id); return (
              <tr key={l.id}><th scope="row"><button type="button" className="linkbtn" onClick={() => d({ t: 'mode', m: l.id })}><span className="mono">{l.key}</span> {l.label}</button></th>
                <td>{(['visible', 'documented', 'notprovided', 'cannot'] as const).filter(k => c[k]).map(k => <StatusChip key={k} s={k} n={c[k]} />)}</td></tr>
            ); })}
          </tbody>
        </table>
      </div>
    );
  }
  const l = layerById(s.mode);
  return (
    <div className="readout">
      <div className="readout__head"><span className="mono">LAYER {l.key} · {l.label.toUpperCase()}</span><span className="muted">{l.question}</span></div>
      <FindingList sp={sp} list={sp.findings[l.id]} d={d} />
    </div>
  );
}

/* ---------- the physical controls: mode selector, knobs, lamp, lightbox table, report printer ---------- */
function Controls({ s, d, stage }: { s: State; d: React.Dispatch<Action>; stage: boolean }) {
  const sc = PL.modes.s, kc = PL.knobs.s;
  const keyFor = (i: number): { m?: Mode; label: string; scan?: boolean } => i === 0 ? { m: 'all', label: 'All layers' } : i === 8 ? { scan: true, label: s.scan ? (s.scan.paused ? 'Resume scan' : 'Pause scan') : 'Scan page' } : { m: LAYERS[i - 1].id, label: LAYERS[i - 1].label };
  const knobs: { label: string; val: string; a: Action; rot: number }[] = [
    { label: 'MAGNIFY', val: mag(s), a: { t: 'magnify' }, rot: s.magnify === 0 ? -120 : s.magnify === 2 ? 0 : 120 },
    { label: 'CONTRAST', val: con(s), a: { t: 'contrast' }, rot: s.contrast === 'normal' ? -120 : s.contrast === 'high' ? 0 : 120 },
    { label: 'OVERLAY', val: ovl(s), a: { t: 'overlay' }, rot: s.overlay === 'notes' ? -120 : s.overlay === 'map' ? 0 : 120 },
    { label: 'PAGE', val: `${s.page + 1}`, a: { t: 'page', i: s.page + 1 }, rot: -150 + (s.page % 12) * 25 }
  ];
  return (
    <div className={'controls' + (stage ? ' controls--stage' : '')}>
      <div className="ctl ctl--modes" style={stage ? pbox('modes') : undefined}>
        <AssetImage k={PL.modes.k} alt="" label="Mode selector panel" />
        <span className="ctl__lcd mono" aria-hidden="true">{s.mode === 'all' ? 'ALL LAYERS' : layerById(s.mode).label.toUpperCase()}</span>
        {KEYS.map(([x, y], i) => {
          const k = keyFor(i); const on = k.m ? s.mode === k.m : !!s.scan && !s.scan.paused;
          return (
            <button key={i} type="button" className={'mkey' + (on ? ' is-on' : '') + (k.scan ? ' mkey--scan' : '')} style={stage ? { left: x * sc - 19, top: y * sc - 17 } : undefined}
              onClick={() => (k.scan ? d({ t: 'scan' }) : d({ t: 'mode', m: k.m! }))} aria-pressed={on} aria-label={`Key ${i + 1}: ${k.label}`} title={k.label}>
              <span className="mono">{k.scan ? '▶' : i === 0 ? 'A' : i + 1}</span>{!stage && <em>{k.label}</em>}
            </button>
          );
        })}
      </div>
      {stage && (
        <div className="legend" style={{ left: 1186, top: 296 }}>
          <span className="mono legend__tag">KEY LEGEND</span>
          <ol><li><b>A</b> All layers</li>{LAYERS.map(l => <li key={l.id}><b>{l.key}</b> {l.label}</li>)}<li><b>▶</b> Scan / pause</li></ol>
        </div>
      )}
      <div className="ctl ctl--knobs" style={stage ? pbox('knobs') : undefined}>
        <AssetImage k={PL.knobs.k} alt="" label="Control knobs" />
        {KNOBS.map(([x, y], i) => (
          <button key={i} type="button" className="knob" style={stage ? { left: x * kc - 26, top: y * kc - 26, ['--rot' as string]: knobs[i].rot + 'deg' } : { ['--rot' as string]: knobs[i].rot + 'deg' }}
            onClick={() => d(knobs[i].a)} aria-label={`${knobs[i].label} knob: ${knobs[i].val}. Turn.`}>
            <span className="knob__ptr" aria-hidden="true" /><span className="knob__lbl mono">{knobs[i].label}<b>{knobs[i].val}</b></span>
          </button>
        ))}
      </div>
      <button type="button" className={'ctl prop p-lamp' + (s.lamp ? ' on' : '')} style={stage ? pbox('lamp') : undefined} onClick={() => d({ t: 'lamp' })} aria-pressed={s.lamp} aria-label={s.lamp ? 'Desk lamp: turn off' : 'Desk lamp: turn on the task light'}>
        <AssetImage k={PL.lamp.k} alt="" /><span className="chip">{s.lamp ? 'LAMP ON' : 'LAMP'}</span>
      </button>
      <button type="button" className="ctl prop p-table" style={stage ? pbox('table') : undefined} onClick={() => d({ t: 'panel', p: 'lightbox' })} aria-label="Imaging table: open the lightbox">
        <AssetImage k={PL.table.k} alt="" /><span className="chip">LIGHTBOX</span>
      </button>
      <button type="button" className={'ctl prop p-rprinter' + (s.printing ? ' is-printing' : '')} style={stage ? pbox('printer') : undefined} onClick={() => d({ t: 'print' })} disabled={s.printing} aria-label="Report printer: print the examination report">
        <AssetImage k={PL.printer.k} alt="" />
        <span className="rp-lcd mono" aria-hidden="true">{s.printing ? 'PRINTING' : s.printed ? 'PRINTED' : 'READY'}</span>
        {s.printing && <span className="rp-paper" aria-hidden="true"><i /><i /><i /><i /></span>}
        <span className="chip">PRINT REPORT</span>
      </button>
    </div>
  );
}
