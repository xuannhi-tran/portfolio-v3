"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/content";
import GraphMini from "@/components/GraphMini";
import HeroBackdrop from "@/components/HeroBackdrop";
import { FIGURES } from "@/components/figures/registry";
import { FakeCursor, useDirector, type Step } from "@/components/hero/Director";
import { SCRIPTS } from "@/components/hero/scripts";

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
  const motion = useMotionOK();
  const compact = useCompact();
  useLayoutEffect(() => {
    if (active && !compact) document.documentElement.classList.add("hero-focus");
    return () => document.documentElement.classList.remove("hero-focus");
  }, [active, compact]);
  const live = item?.figureId ? FIGURES[item.figureId] : undefined;

  return (
    <section
      className="hero"
      // while a preview is playing and the pointer is over the hero, the rest of the page steps back
      onMouseLeave={() => document.documentElement.classList.remove("hero-focus")}
      onMouseEnter={() => active && !compact && document.documentElement.classList.add("hero-focus")}
    >
      <HeroBackdrop />
      <div className="hero-text">
        {name}
        <ul className="featured">
          {items.map((p) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                className={active === p.id ? "is-active" : ""}
                onMouseMove={compact ? undefined : pick(p.id)}
                // on a touch screen the first tap plays the preview, the second tap opens the project
                onClick={(e) => {
                  if (compact && active !== p.id) {
                    e.preventDefault();
                    setActive(p.id);
                  }
                }}
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
            <Scaled key={item.id} flat={compact} script={motion ? SCRIPTS[item.figureId!] : undefined}>
              {/* a scripted figure is driven by the cursor instead of its own autoplay */}
              <live.Component demo={!(motion && SCRIPTS[item.figureId!])} />
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
function Scaled({ children, script, flat }: { children: React.ReactNode; script?: Step[]; flat?: boolean }) {
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
  const { cam, cursor } = useDirector(script, box, inner, fit.scale, flat);
  return (
    <div
      ref={box}
      className={`hero-stage ${cam.z > 1 ? "is-zoom" : ""}`}
      style={{ "--fx": `${cam.fx}%`, "--fy": `${cam.fy}%` } as React.CSSProperties}
      aria-hidden
    >
      <div className="hero-cam" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
        <div ref={inner} className="hero-stage-inner" style={{ width: fit.w, transform: `scale(${fit.scale})` }}>
          {children}
        </div>
      </div>
      {script && <FakeCursor cursor={cursor} />}
    </div>
  );
}

/** False when the visitor asked for reduced motion: then figures just sit still. */
function useMotionOK() {
  const [ok, setOk] = useState(false);
  useLayoutEffect(() => setOk(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches), []);
  return ok;
}

/** Phones and touch screens: the preview is small, so no camera zoom and the page is not dimmed. */
function useCompact() {
  const [c, setC] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const f = () => setC(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return c;
}
