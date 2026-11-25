import { AssetImage } from '../components/AssetImage';
import { asset } from '../data/assets';
import { LAYERS, META, SPECIMENS, specimenById } from '../data/content';
import type { SceneProps } from '../App';
import { saveReport } from '../components/Panels';

/** Scene 5: the exit corridor (PX_ENV_04). The closing line, and the questions the documents couldn't answer. */
export function Exit({ s, d, mode }: SceneProps) {
  const sp = specimenById(s.specimen);
  const asks = sp ? LAYERS.flatMap(l => sp.findings[l.id].filter(f => f.ask).map(f => ({ l: l.label, q: f.ask! }))) : [];
  const others = SPECIMENS.filter(x => !s.examined[x.id]);
  const sign = (
    <div className="hsign hsign--exit"><span className="hsign__wire hsign__wire--l" aria-hidden="true" /><span className="hsign__wire hsign__wire--r" aria-hidden="true" />
      <h1>{META.closing}</h1>
    </div>
  );
  const slip = (
    <div className="qslip">
      <span className="mono qslip__tag">{sp ? `${sp.code} · ${sp.title.toUpperCase()}` : 'NO SPECIMEN'} · QUESTIONS TO TAKE FURTHER</span>
      <p className="qslip__lead">{META.result} These are the questions the file couldn’t answer. Ask the people.</p>
      <ol>{asks.map((a, i) => <li key={i}><span className="mono">{a.l}</span>{a.q}</li>)}</ol>
      <div className="qslip__btns">
        {sp && <button type="button" className="btn" onClick={() => saveReport(sp, 'html')}>Download the report</button>}
        <button type="button" className="btn btn--go" onClick={() => d({ t: 'another' })} autoFocus>{others.length ? `Examine another specimen (${others.length} left)` : 'Examine another specimen'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => d({ t: 'reset' })}>Start again</button>
      </div>
      <p className="qslip__fine">{META.ethics}</p>
    </div>
  );
  if (mode === 'stack') {
    return <section className="sk-scene"><div className="sk-banner" style={{ backgroundImage: `url(${asset('PX_ENV_04_ExitCorridor_v01').path})` }}>{sign}</div>{slip}</section>;
  }
  return (
    <div className="scene scene--exit">
      <AssetImage k="PX_ENV_04_ExitCorridor_v01" className="env" alt="" label="Exit corridor" />
      {sign}{slip}
    </div>
  );
}
