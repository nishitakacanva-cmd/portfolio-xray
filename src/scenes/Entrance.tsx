import { useEffect, useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { asset } from '../data/assets';
import { META } from '../data/content';
import type { SceneProps } from '../App';

/** Scene 1: the clinic corridor (PX_ENV_01). A hanging sign, a notice, and a walk towards the frosted doors. */
export function Entrance({ d, mode, reduced }: SceneProps) {
  const [walking, setWalking] = useState(false);
  const go = () => {
    if (walking) return;
    if (reduced) { d({ t: 'approach' }); return; }
    setWalking(true); window.setTimeout(() => d({ t: 'approach' }), 1100);
  };
  const sign = (
    <div className="hsign" aria-label={`${META.department}. ${META.unit}`}>
      <span className="hsign__wire hsign__wire--l" aria-hidden="true" /><span className="hsign__wire hsign__wire--r" aria-hidden="true" />
      <b>{META.department}</b><span>{META.unit}</span>
    </div>
  );
  const notice = (
    <div className="notice">
      <span className="notice__tag mono">NOTICE · PLEASE READ</span>
      <p>{META.entranceNote}</p>
      <p className="notice__fine">{META.ethics.split('. ')[0]}. {META.ethics.split('. ')[1]}.</p>
      <button type="button" className="btn btn--go" onClick={go} autoFocus>Walk to the doors →</button>
    </div>
  );
  if (mode === 'stack') {
    return (
      <section className="sk-scene">
        <div className="sk-banner" style={{ backgroundImage: `url(${asset('PX_ENV_01_ClinicEntrance_v01').path})` }}>{sign}</div>
        {notice}
      </section>
    );
  }
  return (
    <div className={'scene scene--entrance' + (walking ? ' is-walking' : '')}>
      <div className="dolly"><AssetImage k="PX_ENV_01_ClinicEntrance_v01" className="env" alt="" label="Clinic entrance corridor" /></div>
      <button type="button" className="hit hit--doors" onClick={go} aria-label="The frosted doors at the end of the corridor: walk to them"><span className="chip">FROSTED DOORS</span></button>
      {sign}
      {notice}
    </div>
  );
}

/** Scene 1b: close-up of the frosted double doors (PX_PROP_01 split into two leaves); reception behind the glass. */
export function Doors({ s, d, mode, reduced }: SceneProps) {
  useEffect(() => {
    if (!s.doorsOpen) return;
    const id = window.setTimeout(() => d({ t: 'enter' }), reduced ? 120 : 1250);
    return () => window.clearTimeout(id);
  }, [s.doorsOpen, reduced, d]);
  const open = () => d({ t: 'openDoors' });
  return (
    <div className={'scene scene--doors' + (s.doorsOpen ? ' is-open' : '') + (mode === 'stack' ? ' is-stack' : '')}>
      <AssetImage k="PX_ENV_02_Reception_v01" className="env doors__behind" alt="" label="Reception, seen through the glass" />
      <div className="doors__frame">
        <button type="button" className="leaf leaf--l" onClick={open} aria-label="Push the left door" tabIndex={-1}><AssetImage k="PX_PROP_01_FrostedDoubleDoors_v01__left" alt="" /></button>
        <button type="button" className="leaf leaf--r" onClick={open} aria-label="Push the right door" tabIndex={-1}><AssetImage k="PX_PROP_01_FrostedDoubleDoors_v01__right" alt="" /></button>
      </div>
      <div className="doors__ui">
        <p className="mono">{META.unit} · AUTHORISED VISITORS</p>
        <button type="button" className="btn btn--go" onClick={open} disabled={s.doorsOpen} autoFocus>{s.doorsOpen ? 'Opening…' : 'Push the doors'}</button>
      </div>
    </div>
  );
}
