import raw from './content.json';
import pagesRaw from './pages.json';

/** Typed view of content.json, the single editable content source for the clinic, the report and the exports. */
export type Status = 'visible' | 'documented' | 'notprovided' | 'cannot';
export type LayerId = 'visible' | 'context' | 'evidence' | 'choices' | 'change' | 'people' | 'beyond';
export type Finding = { s: Status; t: string; p: number[]; ask?: string };
export type Hotspot = { page: number; x: number; y: number; w: number; h: number; layer: LayerId; s: Status; title: string; note: string };
export type Layer = { id: LayerId; key: number; label: string; question: string };
export type PageImg = { n: number; src: string; thumb: string; w: number; h: number; note?: string };
export type Specimen = {
  id: 'bachat' | 'canva' | 'natures'; code: string; title: string; subtitle: string; course: string;
  credited: string[]; creditPage: number | null; file: string; pageCount: number; images: boolean;
  recommended?: string; fileNote?: string; spelling?: string; omitted?: string; withheld?: string;
  folder: { visible: string; context: string; change: string[] };
  findings: Record<LayerId, Finding[]>; hotspots: Hotspot[];
  versions: null | { a: { page: number; label: string }; b: { page: number; label: string }; note: string };
  pagesText?: { n: number; t: string }[];
};

const C = raw as unknown as {
  meta: Record<'department' | 'unit' | 'question' | 'result' | 'closing' | 'attribution' | 'ethics' | 'entranceNote' | 'consent', string>;
  statuses: Record<Status, { label: string; desc: string }>;
  layers: Layer[]; specimens: Specimen[]; sources: { files: string; sb: string }; disclaimers: string[];
};
const P = pagesRaw as Record<string, PageImg[]>;

export const META = C.meta;
export const STATUSES = C.statuses;
export const STATUS_ORDER: Status[] = ['visible', 'documented', 'notprovided', 'cannot'];
export const LAYERS = C.layers;
export const SPECIMENS = C.specimens;
export const SOURCES = C.sources;
export const DISCLAIMERS = C.disclaimers;
export const specimenById = (id: string | null) => SPECIMENS.find(s => s.id === id) ?? null;
export const layerById = (id: string) => LAYERS.find(l => l.id === id)!;

/** The pages the exhibit can show for a specimen: rendered images, or text records when images are withheld. */
export type ViewPage = { n: number; img: PageImg | null; text?: string };
export function viewPages(sp: Specimen): ViewPage[] {
  if (sp.images) return (P[sp.id] ?? []).map(img => ({ n: img.n, img }));
  return (sp.pagesText ?? []).map(x => ({ n: x.n, img: null, text: x.t }));
}

export function counts(sp: Specimen, layer?: LayerId): Record<Status, number> {
  const out: Record<Status, number> = { visible: 0, documented: 0, notprovided: 0, cannot: 0 };
  const ls = layer ? [layer] : LAYERS.map(l => l.id);
  for (const l of ls) for (const f of sp.findings[l]) out[f.s]++;
  return out;
}
