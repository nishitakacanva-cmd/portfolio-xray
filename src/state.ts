import { SPECIMENS, specimenById, viewPages, type LayerId } from './data/content';

export type Phase = 'entrance' | 'doors' | 'reception' | 'chamber' | 'exit';
export type Mode = 'all' | LayerId;
export type Contrast = 'normal' | 'high' | 'xray';
export type Overlay = 'notes' | 'map' | 'off';
export type Panel = null | 'folders' | 'register' | 'lightbox' | 'compare' | 'research' | 'report';

export type State = {
  phase: Phase;
  doorsOpen: boolean;
  ticket: number | null;
  nextTicket: number;
  specimen: string | null;
  consent: boolean;
  registered: boolean;
  page: number;                       // index into viewPages(specimen)
  scan: null | { key: string; paused: boolean };
  scanned: Record<string, true>;      // `${specimen}:${n}`
  mode: Mode;
  magnify: 0 | 2 | 3;
  contrast: Contrast;
  overlay: Overlay;
  lamp: boolean;
  hotspot: number | null;             // index into specimen.hotspots
  panel: Panel;
  compareTab: 'versions' | 'specimens';
  split: number;
  printing: boolean;
  printed: boolean;
  examined: Record<string, true>;
  announce: string;
};

export const FIRST_TICKET = 17;
export const initial: State = {
  phase: 'entrance', doorsOpen: false, ticket: null, nextTicket: FIRST_TICKET, specimen: null, consent: false, registered: false,
  page: 0, scan: null, scanned: {}, mode: 'all', magnify: 0, contrast: 'normal', overlay: 'notes', lamp: false, hotspot: null,
  panel: null, compareTab: 'versions', split: 50, printing: false, printed: false, examined: {}, announce: ''
};

export type Action =
  | { t: 'approach' } | { t: 'openDoors' } | { t: 'enter' }
  | { t: 'ticket' } | { t: 'panel'; p: Panel } | { t: 'pick'; id: string } | { t: 'consent'; v: boolean } | { t: 'register' }
  | { t: 'page'; i: number } | { t: 'scan' } | { t: 'scanDone' } | { t: 'mode'; m: Mode }
  | { t: 'magnify' } | { t: 'contrast' } | { t: 'overlay' } | { t: 'lamp' } | { t: 'hotspot'; i: number | null }
  | { t: 'goto'; n: number; hotspot?: number | null } | { t: 'compareTab'; v: 'versions' | 'specimens' } | { t: 'split'; v: number }
  | { t: 'switchSpecimen'; id: string } | { t: 'print' } | { t: 'printed' } | { t: 'exit' } | { t: 'another' } | { t: 'reset' };

export const pageKey = (s: State) => {
  const sp = specimenById(s.specimen); if (!sp) return '';
  const vp = viewPages(sp)[s.page]; return vp ? `${sp.id}:${vp.n}` : '';
};
const pageCount = (s: State) => { const sp = specimenById(s.specimen); return sp ? viewPages(sp).length : 0; };

export function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'approach': return s.phase === 'entrance' ? { ...s, phase: 'doors', announce: 'You walk to the frosted doors.' } : s;
    case 'openDoors': return s.phase === 'doors' && !s.doorsOpen ? { ...s, doorsOpen: true, announce: 'The doors slide open.' } : s;
    case 'enter': return s.phase === 'doors' ? { ...s, phase: 'reception', announce: 'Reception. Take a ticket.' } : s;
    case 'ticket': {
      if (s.ticket !== null) return { ...s, announce: `You already hold ticket PX-0${s.ticket}.` };
      return { ...s, ticket: s.nextTicket, nextTicket: s.nextTicket + 1, announce: `Ticket PX-0${s.nextTicket}. Now serving PX-0${s.nextTicket}. Choose a specimen folder.` };
    }
    case 'panel': {
      if (a.p === 'folders' && s.ticket === null) return { ...s, announce: 'Take a ticket first.' };
      if (a.p === 'register' && !s.specimen) return { ...s, announce: 'Choose a specimen folder first.' };
      return { ...s, panel: a.p, hotspot: a.p === null ? s.hotspot : s.hotspot };
    }
    case 'pick': {
      const sp = specimenById(a.id); if (!sp) return s;
      return { ...s, specimen: a.id, registered: false, page: 0, scan: null, hotspot: null, mode: 'all', compareTab: 'versions', split: 50, panel: 'register', announce: `${sp.code}: ${sp.title} selected. Complete the registration form.` };
    }
    case 'consent': return { ...s, consent: a.v };
    case 'register': {
      if (!s.specimen || !s.consent) return { ...s, announce: 'Tick the declaration to continue.' };
      const sp = specimenById(s.specimen)!;
      return { ...s, registered: true, panel: null, phase: 'chamber', examined: { ...s.examined, [sp.id]: true }, announce: `Imaging chamber. ${sp.title}, page 1. Press scan.` };
    }
    case 'page': {
      const n = pageCount(s); if (!n) return s;
      const i = ((a.i % n) + n) % n;
      return { ...s, page: i, scan: null, hotspot: null, announce: `Page ${i + 1} of ${n}` };
    }
    case 'goto': {
      const sp = specimenById(s.specimen); if (!sp) return s;
      const i = viewPages(sp).findIndex(p => p.n === a.n);
      if (i < 0) return { ...s, announce: `Page ${a.n} is not shown in this exhibit.` };
      return { ...s, page: i, scan: null, hotspot: a.hotspot ?? null, panel: s.panel === 'lightbox' ? 'lightbox' : null, announce: `Page ${a.n}` };
    }
    case 'scan': {
      const k = pageKey(s); if (!k) return s;
      if (!s.scan) return { ...s, scan: { key: k, paused: false }, hotspot: null, announce: 'Scanning.' };
      return { ...s, scan: { ...s.scan, paused: !s.scan.paused }, announce: s.scan.paused ? 'Scan resumed.' : 'Scan paused.' };
    }
    case 'scanDone': {
      if (!s.scan) return s;
      return { ...s, scanned: { ...s.scanned, [s.scan.key]: true }, scan: null, announce: 'Scan complete. Notes are on the page.' };
    }
    case 'mode': return { ...s, mode: a.m, hotspot: null, announce: a.m === 'all' ? 'All layers' : `Layer: ${a.m}` };
    case 'magnify': { const m = s.magnify === 0 ? 2 : s.magnify === 2 ? 3 : 0; return { ...s, magnify: m, announce: m ? `Magnifier ${m}×` : 'Magnifier off' }; }
    case 'contrast': { const c = s.contrast === 'normal' ? 'high' : s.contrast === 'high' ? 'xray' : 'normal'; return { ...s, contrast: c, announce: `Contrast: ${c === 'xray' ? 'X-ray' : c}` }; }
    case 'overlay': { const o = s.overlay === 'notes' ? 'map' : s.overlay === 'map' ? 'off' : 'notes'; return { ...s, overlay: o, announce: `Overlay: ${o === 'map' ? 'status map' : o}` }; }
    case 'lamp': return { ...s, lamp: !s.lamp, announce: s.lamp ? 'Lamp off' : 'Lamp on' };
    case 'hotspot': return { ...s, hotspot: a.i };
    case 'compareTab': return { ...s, compareTab: a.v };
    case 'split': return { ...s, split: Math.max(0, Math.min(100, a.v)) };
    case 'switchSpecimen': {
      const sp = specimenById(a.id); if (!sp) return s;
      return { ...s, specimen: a.id, page: 0, scan: null, hotspot: null, mode: 'all', compareTab: 'versions', split: 50, panel: null, printed: false, examined: { ...s.examined, [a.id]: true }, announce: `Now examining ${sp.title}` };
    }
    case 'print': return s.printing ? s : { ...s, printing: true, panel: null, announce: 'Printing the examination report.' };
    case 'printed': return { ...s, printing: false, printed: true, panel: 'report' };
    case 'exit': return { ...s, phase: 'exit', panel: null, scan: null, announce: 'Exit corridor.' };
    case 'another': return { ...s, phase: 'reception', ticket: null, specimen: null, consent: false, registered: false, panel: null, printed: false, scan: null, hotspot: null, mode: 'all', page: 0, announce: 'Back at reception. Take a new ticket.' };
    case 'reset': return { ...initial, announce: 'Reset. You are back at the entrance.' };
  }
}

export const SPECIMEN_IDS = SPECIMENS.map(s => s.id);
