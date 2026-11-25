import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { initial, reducer, type Phase } from './state';
import { META, specimenById } from './data/content';
import { Entrance, Doors } from './scenes/Entrance';
import { Reception } from './scenes/Reception';
import { Chamber } from './scenes/Chamber';
import { Exit } from './scenes/Exit';
import { Compare, Folders, Lightbox, Modal, Register, Report, Research } from './components/Panels';

const BASE_W = 1376, BASE_H = 768, BAR = 52, MIN_SCALE = 0.66;
const STEPS: { id: Phase[]; label: string }[] = [
  { id: ['entrance', 'doors'], label: 'Entrance' }, { id: ['reception'], label: 'Reception' },
  { id: ['chamber'], label: 'Imaging' }, { id: ['exit'], label: 'Exit' }
];

function useReducedMotion() {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [r, setR] = useState(!!q?.matches);
  useEffect(() => { if (!q) return; const f = () => setR(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, [q]);
  return r;
}

export default function App() {
  const [s, d] = useReducer(reducer, initial);
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, avail: 700, mode: 'stage' as 'stage' | 'stack' });
  const touch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || !!window.matchMedia?.('(pointer: coarse)').matches);

  useLayoutEffect(() => {
    const f = () => {
      const w = wrap.current?.clientWidth ?? window.innerWidth; const h = window.innerHeight - BAR;
      const scale = Math.min(w / BASE_W, h / BASE_H);
      setFit({ scale, avail: h, mode: scale < MIN_SCALE || window.innerWidth < 900 ? 'stack' : 'stage' });
    };
    f(); const ro = new ResizeObserver(f); if (wrap.current) ro.observe(wrap.current); window.addEventListener('resize', f);
    return () => { ro.disconnect(); window.removeEventListener('resize', f); };
  }, []);

  // Printing animation → report.
  useEffect(() => {
    if (!s.printing) return;
    const id = window.setTimeout(() => d({ t: 'printed' }), reduced ? 150 : 1700);
    return () => window.clearTimeout(id);
  }, [s.printing, reduced]);

  const sp = specimenById(s.specimen);
  const close = () => d({ t: 'panel', p: null });
  const scene = { s, d, mode: fit.mode, reduced };
  const step = STEPS.findIndex(x => x.id.includes(s.phase));
  return (
    <div className={'app mode-' + fit.mode + (reduced ? ' rm' : '') + (touch ? ' is-touch' : '') + ' ph-' + s.phase}>
      <header className="topbar">
        <div className="topbar__brand"><b>Portfolio X-Ray</b><span>{META.attribution}</span></div>
        <ol className="topbar__steps" aria-label="Route through the unit">
          {STEPS.map((x, i) => <li key={x.label} className={i === step ? 'is-here' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>{x.label}</li>)}
        </ol>
        <div className="topbar__tools">
          {s.ticket !== null && <span className="topbar__ticket mono" aria-label={`Ticket PX-0${s.ticket}`}>PX-0{s.ticket}</span>}
          <button type="button" className="tbtn" onClick={() => d({ t: 'panel', p: 'research' })}>Research</button>
          <button type="button" className="tbtn tbtn--ghost" onClick={() => d({ t: 'reset' })}>Reset</button>
        </div>
      </header>

      <main className="world" ref={wrap}>
        {fit.mode === 'stage' ? (
          <div className="stage-wrap" style={{ height: fit.avail }}>
            <div className="stage" style={{ transform: `scale(${fit.scale})`, top: Math.max(0, (fit.avail - BASE_H * fit.scale) / 2) }}>
              <SceneSwitch {...scene} />
              <span className="stage__attr">{META.attribution.toUpperCase()} · A THEATRICAL INSPECTION · DOCUMENTS, NOT PEOPLE</span>
            </div>
          </div>
        ) : (
          <div className="stack"><SceneSwitch {...scene} /><p className="stack__attr">{META.attribution} · a theatrical inspection · documents, not people</p></div>
        )}
      </main>

      <Modal open={s.panel === 'folders'} onClose={close} label={META.question} className="modal--wide"><Folders s={s} d={d} /></Modal>
      <Modal open={s.panel === 'register'} onClose={close} label="Registration form"><Register s={s} d={d} /></Modal>
      <Modal open={s.panel === 'lightbox' && !!sp} onClose={close} label="Lightbox" className="modal--full"><Lightbox s={s} d={d} /></Modal>
      <Modal open={s.panel === 'compare' && !!sp} onClose={close} label="Compare" className="modal--wide"><Compare s={s} d={d} /></Modal>
      <Modal open={s.panel === 'research'} onClose={close} label="Research drawer" className="modal--drawer"><Research s={s} d={d} /></Modal>
      <Modal open={s.panel === 'report' && !!sp} onClose={close} label="Portfolio examination report" className="modal--report"><Report s={s} d={d} /></Modal>
      {s.panel === 'report' && sp && <Report s={s} d={d} printOnly />}
      <p className="sr-only" role="status" aria-live="polite">{s.announce}</p>
    </div>
  );
}

type SP = { s: typeof initial; d: React.Dispatch<import('./state').Action>; mode: 'stage' | 'stack'; reduced: boolean };
function SceneSwitch(p: SP) {
  switch (p.s.phase) {
    case 'entrance': return <Entrance {...p} />;
    case 'doors': return <Doors {...p} />;
    case 'reception': return <Reception {...p} />;
    case 'chamber': return <Chamber {...p} />;
    case 'exit': return <Exit {...p} />;
  }
}
export type SceneProps = SP;
