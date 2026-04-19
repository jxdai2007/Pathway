'use client';
import { useEffect, useRef } from 'react';
import rough from 'roughjs';

type Props = {
  width: number;
  height: number;
  seed: number;
  stroke?: string;
  fill?: string;
  dashed?: boolean;
  roughness?: number;
  strokeWidth?: number;
};

export function RoughRect({
  width,
  height,
  seed,
  stroke = '#1e3a5f',
  fill = 'none',
  dashed = false,
  roughness = 1.8,
  strokeWidth = 2.2,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    try {
      const rc = rough.svg(el);
      const opts: Parameters<typeof rc.rectangle>[4] = {
        roughness,
        bowing: 1.5,
        strokeWidth,
        stroke,
        seed,
        fillStyle: 'hachure',
        hachureAngle: -35,
        hachureGap: 6,
      };
      if (fill !== 'none') (opts as Record<string, unknown>).fill = fill;
      if (dashed) opts.strokeLineDash = [6, 8];
      el.appendChild(rc.rectangle(1, 1, width - 2, height - 2, opts));
    } catch (e) {
      // fallback: plain rect
      const ns = 'http://www.w3.org/2000/svg';
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', '1');
      r.setAttribute('y', '1');
      r.setAttribute('width', String(width - 2));
      r.setAttribute('height', String(height - 2));
      r.setAttribute('fill', fill === 'none' ? 'transparent' : fill);
      r.setAttribute('stroke', stroke);
      r.setAttribute('stroke-width', String(strokeWidth));
      if (dashed) r.setAttribute('stroke-dasharray', '6 8');
      el.appendChild(r);
      console.warn('rough.js failed, falling back to <rect>', e);
    }
  }, [width, height, seed, stroke, fill, dashed, roughness, strokeWidth]);

  return (
    <svg
      ref={ref}
      className="absolute inset-0"
      style={{ overflow: 'visible' }}
      width={width}
      height={height}
    />
  );
}
