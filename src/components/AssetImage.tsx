import { useState, type CSSProperties } from 'react';
import { asset } from '../data/assets';

/** Renders a verified asset; if it fails to load, shows a labelled fallback panel instead of a broken-image icon. */
export function AssetImage({ k, alt = '', className = '', style, label }: { k: string; alt?: string; className?: string; style?: CSSProperties; label?: string }) {
  const a = asset(k);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={'asset-fallback ' + className} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} data-missing={k}>
        <span>{label || alt || k.replace(/^PX_[A-Z]+_\d+_/, '').replace(/_v01.*$/, '').replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
      </span>
    );
  }
  return <img src={a.path} width={a.w} height={a.h} alt={alt} className={className} style={style} draggable={false} decoding="async" onError={() => setFailed(true)} />;
}
