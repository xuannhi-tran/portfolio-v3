"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A scripted "screen recording" of a figure: a cursor moves, clicks real buttons and types into real
 * inputs, and a camera zooms in on wherever the action is, then pulls back. The figure underneath is
 * the real interactive component, so everything it shows is computed live, not faked.
 */
export type Step =
  | { wide: true; hold?: number }
  | { focus: string; zoom: number; at?: [number, number]; hold?: number }
  | { click: string; hold?: number }
  | { type: string; into: string; hold?: number }
  | { drag: string; to: number; hold?: number };

/** Camera offset and zoom, plus the on-screen point it is looking at (the sharp centre of the blur). */
type Cam = { x: number; y: number; z: number; fx: number; fy: number };
type Cursor = { x: number; y: number; on: boolean; down: boolean; clicks: number };

/** Camera and cursor glide together, like a screen recording that follows the pointer. */
const MOVE_MS = 900;

const sleep = (ms: number, alive: () => boolean) =>
  new Promise<void>((res, rej) => setTimeout(() => (alive() ? res() : rej(new Error("stopped"))), ms));

export function useDirector(
  script: Step[] | undefined,
  box: React.RefObject<HTMLDivElement | null>,
  content: React.RefObject<HTMLDivElement | null>,
  scale: number,
) {
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 1, fx: 50, fy: 50 });
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0, on: false, down: false, clicks: 0 });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    if (!script?.length) return;
    let alive = true;
    const isAlive = () => alive;

    /** The visible element a selector means: when several match, the one highest on screen. */
    const find = (sel: string) => {
      const els = [...(content.current?.querySelectorAll<HTMLElement>(sel) ?? [])].filter((el) => el.getClientRects().length);
      return els.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    };
    /** Element rect in the figure's own layout pixels (before any scaling). */
    const local = (el: HTMLElement) => {
      const c = content.current!;
      const r = el.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const k = cr.width / c.offsetWidth || 1;
      return { x: (r.left - cr.left) / k, y: (r.top - cr.top) / k, w: r.width / k, h: r.height / k };
    };
    const frame = () => {
      const b = box.current!, c = content.current!, s = scaleRef.current;
      return { bw: b.clientWidth, bh: b.clientHeight, W: c.offsetWidth * s, H: c.offsetHeight * s, s };
    };
    // the pointer's position in the figure's layout pixels, and the current zoom
    let px = 0, py = 0, zoom = 1;
    /** Camera that keeps the pointer as close to the centre as the figure's edges allow. */
    const camAt = (z: number): Cam => {
      const { bw, bh, W, H, s } = frame();
      const cx = px * s, cy = py * s;
      const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
      const x = z === 1 ? 0 : clamp(bw / 2 - cx * z, Math.min(0, bw - W * z), 0);
      const y = z === 1 ? 0 : clamp(bh / 2 - cy * z, Math.min(0, bh - H * z), 0);
      return { z, x, y, fx: ((x + cx * z) / bw) * 100, fy: ((y + cy * z) / bh) * 100 };
    };
    /** Move the pointer (and the camera with it) to a point of an element, optionally changing zoom. */
    const go = async (el: HTMLElement | undefined, fx = 0.5, fy = 0.5, z = zoom) => {
      if (el) {
        const r = local(el);
        px = r.x + r.w * fx;
        py = r.y + r.h * fy;
      }
      zoom = z;
      const c = camAt(z);
      const { s } = frame();
      setCam(c);
      setCursor((cur) => ({ ...cur, x: c.x + px * s * z, y: c.y + py * s * z, on: true }));
      await sleep(MOVE_MS, isAlive);
    };
    const press = async () => {
      setCursor((c) => ({ ...c, down: true, clicks: c.clicks + 1 }));
      await sleep(140, isAlive);
      setCursor((c) => ({ ...c, down: false }));
    };
    const setValue = (el: HTMLInputElement, v: string) => {
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };

    (async () => {
      // let the figure lay out (and the 3D scene load) before the first shot
      await sleep(500, isAlive);
      const { W, H, s } = frame();
      px = (W / s) * 0.75;
      py = (H / s) * 0.8;
      for (;;) {
        for (const step of script) {
          if ("wide" in step) await go(undefined, 0.5, 0.5, 1);
          else if ("focus" in step) await go(find(step.focus), ...(step.at ?? [0.5, 0.5]), step.zoom);
          else if ("click" in step) {
            const el = find(step.click);
            if (el) {
              await go(el);
              await press();
              el.click();
            }
          } else if ("type" in step) {
            const el = find(step.into) as HTMLInputElement | undefined;
            if (el) {
              await go(el, 0.12);
              await press();
              setValue(el, "");
              for (const ch of step.type) {
                setValue(el, el.value + ch);
                await sleep(38 + Math.random() * 40, isAlive);
              }
            }
          } else if ("drag" in step) {
            const el = find(step.drag) as HTMLInputElement | undefined;
            if (el) {
              const min = Number(el.min || 0), max = Number(el.max || 100);
              const at = (v: number) => (v - min) / (max - min);
              await go(el, at(Number(el.value)));
              setCursor((c) => ({ ...c, down: true }));
              setValue(el, String(step.to));
              await go(el, at(step.to));
              setCursor((c) => ({ ...c, down: false }));
            }
          }
          await sleep(step.hold ?? 400, isAlive);
        }
      }
    })().catch(() => {});

    return () => {
      alive = false;
    };
  }, [script, box, content]);

  return { cam, cursor };
}

/** The pointer drawn over the preview. */
export function FakeCursor({ cursor }: { cursor: Cursor }) {
  return (
    <div
      className={`fake-cursor ${cursor.on ? "on" : ""} ${cursor.down ? "down" : ""}`}
      style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
    >
      <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
        <path d="M2 1.5 L2 17.5 L6.4 13.4 L9.3 20 L12.2 18.7 L9.4 12.3 L15.5 12.3 Z" />
      </svg>
      {cursor.clicks > 0 && <i key={cursor.clicks} />}
    </div>
  );
}
