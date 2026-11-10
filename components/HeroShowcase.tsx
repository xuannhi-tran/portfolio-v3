"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/content";
import GraphMini from "@/components/GraphMini";
import HeroBackdrop from "@/components/HeroBackdrop";
import { FIGURES } from "@/components/figures/registry";

export type HeroItem = { id: string; name: string; tagline?: string; current: boolean; figureId?: string; fig: number };

/** Width the figures are laid out at before being scaled down into the preview. */
const STAGE_W = 1040;
/** Narrowest layout width, so short figures still look like their desktop layout. */
const STAGE_MIN = 620;
/** Pixels the pointer must be inside a new item before the preview switches to it. */
const EDGE = 8;

/**
 * Hero: the featured list on the left, and a preview on the right.
 * Hovering (or focusing) a project plays its figure in the preview; before that, the mini graph shows.
 */
export default function HeroShowcase({ items, graph, name }: { items: HeroItem[]; graph: Graph; name: React.ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  // A cursor resting on the line between two items (or a hand tremor of a pixel) used to flip the
  // preview back and forth. Ignore moves that don't actually move, and only switch to another item
  // once the pointer is a few pixels inside it.
  const last = useRef({ x: -1, y: -1 });
  const pick = (id: string) => (e: React.MouseEvent<HTMLElement>) => {
    if (e.clientX === last.current.x && e.clientY === last.current.y) return;
    last.current = { x: e.clientX, y: e.clientY };
    if (id === active) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (active && Math.min(e.clientY - r.top, r.bottom - e.clientY) < EDGE) return;
    setActive(id);
  };
  const item = items.find((i) => i.id === active);
  const live = item?.figureId ? FIGURES[item.figureId] : undefined;

  return (
    <section className="hero">
      <HeroBackdrop />
      <div className="hero-text">
        {name}
        <ul className="featured">
          {items.map((p) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                className={active === p.id ? "is-active" : ""}
                onMouseMove={pick(p.id)}
                onFocus={() => setActive(p.id)}
              >
                <b>{p.name}</b>
                {p.current && <i className="live-dot" aria-label="current" />}
                <span>{p.tagline}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {live && item ? (
        <div className="fig hero-preview">
          <div className="fig-inner">
            <div className="fig-head">
              <span>FIG. {item.fig} · {live.head}</span>
              <span className="fig-status">PREVIEW ↓</span>
            </div>
            <Scaled key={item.id}>
              <live.Component demo />
            </Scaled>
          </div>
          {/* the figure inside is only a preview; the whole card links to the real one */}
          <a href={`#${item.id}`} className="hero-preview-link" aria-label={`Open FIG. ${item.fig}: ${item.name}`} />
        </div>
      ) : (
        <GraphMini graph={graph} />
      )}
    </section>
  );
}

/**
 * Renders a full-size figure and scales it into the preview.
 * Each figure has its own shape (the 3D room is short and wide, the pipeline is tall), so instead of one
 * fixed layout width, pick the widest width (STAGE_MIN..STAGE_W) at which the figure, scaled to the
 * preview's width, still fills the preview's height. Measured once on mount and on resize only, so the
 * demo changing the figure's content doesn't make the preview jump.
 */
function Scaled({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: STAGE_W, scale: 0.55 });
  useLayoutEffect(() => {
    const el = box.current, content = inner.current;
    if (!el || !content) return;
    const measure = () => {
      const bw = el.clientWidth, bh = el.clientHeight;
      if (!bw || !bh) return;
      const tallEnough = (w: number) => {
        content.style.width = `${w}px`;
        return content.offsetHeight / w >= bh / bw;
      };
      let w = STAGE_W;
      if (!tallEnough(STAGE_W)) {
        let lo = STAGE_MIN, hi = STAGE_W; // lo is the fallback when even the narrowest is too short
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          if (tallEnough(mid)) lo = mid;
          else hi = mid;
        }
        w = Math.round(lo);
      }
      content.style.width = `${w}px`;
      setFit({ w, scale: bw / w });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="hero-stage" aria-hidden>
      <div ref={inner} className="hero-stage-inner" style={{ width: fit.w, transform: `scale(${fit.scale})` }}>
        {children}
      </div>
    </div>
  );
}
