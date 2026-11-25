import type { CSSProperties } from 'react';
import { AssetImage } from '../components/AssetImage';
import { asset } from '../data/assets';
import { META, specimenById } from '../data/content';
import type { SceneProps } from '../App';

/** Plate-unit layout for reception (PX_ENV_02 is 1376×768). */
const L = {
  poster: { k: 'PX_FORM_04_InstitutionalPoster_v01', x: 514, y: 66, s: 0.36 },
  counter: { k: 'PX_PROP_02_ReceptionCounter_v01', x: 300, y: 372, s: 1.25 },
  printer: { k: 'PX_PROP_05_QueueTicketPrinter_v01', x: 336, y: 314, s: 0.45 },
  folders: { k: 'PX_PROP_04_SpecimenFolders_v01', x: 494, y: 286, s: 0.5 },
  clipboard: { k: 'PX_PROP_06_Clipboard_v01', x: 720, y: 302, s: 0.42 },
  monitor: { k: 'PX_PROP_07_MonitorShell_v01', x: 916, y: 262, s: 0.52 }
} as const;
type K = keyof typeof L;
const box = (k: K): CSSProperties => { const a = asset(L[k].k); return { left: L[k].x, top: L[k].y, width: a.w * L[k].s, height: a.h * L[k].s }; };

export function Reception({ s, d, mode }: SceneProps) {
  const sp = specimenById(s.specimen);
  const step = s.ticket === null ? 1 : !sp ? 2 : 3;
  const tno = s.ticket !== null ? `PX-0${s.ticket}` : '—';
  const guide = (
    <div className="guide" aria-label="Reception steps">
      <span className="mono guide__tag">RECEPTION</span>
      <h2>{META.question}</h2>
      <ol>
        <li className={step > 1 ? 'is-done' : step === 1 ? 'is-now' : ''}>Take a queue ticket</li>
        <li className={step > 2 ? 'is-done' : step === 2 ? 'is-now' : ''}>Choose a specimen folder</li>
        <li className={step === 3 ? 'is-now' : ''}>Sign the registration form on the clipboard</li>
      </ol>
      <div className="guide__btns">
        {step === 1 && <button type="button" className="btn btn--go" onClick={() => d({ t: 'ticket' })}>Take a ticket</button>}
        {step === 2 && <button type="button" className="btn btn--go" onClick={() => d({ t: 'panel', p: 'folders' })}>Open the specimen folders</button>}
        {step === 3 && <button type="button" className="btn btn--go" onClick={() => d({ t: 'panel', p: 'register' })}>Sign in: {sp!.title}</button>}
        {step === 3 && <button type="button" className="btn btn--ghost" onClick={() => d({ t: 'panel', p: 'folders' })}>Change folder</button>}
      </div>
    </div>
  );
  const screen = (
    <span className="crt" aria-hidden="true">
      <small>NOW SERVING</small><b>{tno}</b>
      <i>{s.ticket === null ? 'PLEASE TAKE A TICKET' : sp ? `${sp.code} · ${sp.title.toUpperCase()}` : 'PLEASE SELECT A SPECIMEN'}</i>
    </span>
  );

  if (mode === 'stack') {
    return (
      <section className="sk-scene">
        <div className="sk-banner" style={{ backgroundImage: `url(${asset('PX_ENV_02_Reception_v01').path})` }}><div className="sk-crt"><AssetImage k={L.monitor.k} alt="" />{screen}</div></div>
        {guide}
        <div className="sk-props">
          <button type="button" className="sk-prop" onClick={() => d({ t: 'ticket' })} aria-label={s.ticket === null ? 'Ticket printer: take a ticket' : `Ticket printer: you hold ${tno}`}><AssetImage k={L.printer.k} alt="" /><span className="chip">{s.ticket === null ? 'TAKE A TICKET' : tno}</span></button>
          <button type="button" className="sk-prop" onClick={() => d({ t: 'panel', p: 'folders' })} aria-label="Specimen folders: choose one"><AssetImage k={L.folders.k} alt="" /><span className="chip">SPECIMEN FOLDERS</span></button>
          <button type="button" className="sk-prop" onClick={() => d({ t: 'panel', p: 'register' })} aria-label="Clipboard: registration form"><AssetImage k={L.clipboard.k} alt="" /><span className="chip">REGISTRATION</span></button>
        </div>
      </section>
    );
  }
  return (
    <div className="scene scene--reception">
      <AssetImage k="PX_ENV_02_Reception_v01" className="env" alt="" label="Reception" />
      <span className="obj deco" style={box('poster')}><AssetImage k={L.poster.k} alt={META.result} /></span>
      <span className="obj deco counter" style={box('counter')} aria-hidden="true"><AssetImage k={L.counter.k} alt="" /></span>
      <button type="button" className={'obj prop p-printer' + (s.ticket !== null ? ' on' : '')} style={box('printer')} onClick={() => d({ t: 'ticket' })}
        aria-label={s.ticket === null ? 'Queue ticket printer: take a ticket' : `Queue ticket printer: you hold ticket ${tno}`}>
        <AssetImage k={L.printer.k} alt="" />
        {s.ticket !== null && <span className="qticket" key={s.ticket} aria-hidden="true"><small>{META.unit}</small><b>{tno}</b><i>PLEASE WAIT TO BE CALLED</i></span>}
        <span className="chip">{s.ticket === null ? 'TAKE A TICKET' : tno}</span>
      </button>
      <button type="button" className={'obj prop p-folders' + (s.ticket === null ? ' is-locked' : '')} style={box('folders')} onClick={() => d({ t: 'panel', p: 'folders' })} aria-label={s.ticket === null ? 'Specimen folders (take a ticket first)' : 'Specimen folders: choose what to examine'}>
        <AssetImage k={L.folders.k} alt="" /><span className="chip">SPECIMEN FOLDERS</span>
      </button>
      <button type="button" className={'obj prop p-clip' + (!sp ? ' is-locked' : '')} style={box('clipboard')} onClick={() => d({ t: 'panel', p: 'register' })} aria-label={!sp ? 'Clipboard (choose a specimen first)' : 'Clipboard: registration form'}>
        <AssetImage k={L.clipboard.k} alt="" />{sp && <span className="clipnote hand" aria-hidden="true">{sp.code}</span>}<span className="chip">REGISTRATION</span>
      </button>
      <span className="obj deco p-monitor" style={box('monitor')}><AssetImage k={L.monitor.k} alt="" />{screen}</span>
      {guide}
    </div>
  );
}
