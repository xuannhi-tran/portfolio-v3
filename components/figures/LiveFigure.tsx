"use client";

import { useEffect, useRef, useState } from "react";
import { FIGURES } from "./registry";

/** How long the visitor must leave a figure alone before it starts playing itself again. */
const IDLE_MS = 3000;

/**
 * A figure that plays itself while it is on screen, like a looping clip.
 * The moment the visitor clicks or types inside it (scrolling past doesn't count), the autoplay stops and it is theirs;
 * after IDLE_MS without input it picks the autoplay back up.
 */
export default function LiveFigure({ id }: { id: string }) {
  const live = FIGURES[id];
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    let t: ReturnType<typeof setTimeout> | undefined;
    const touch = () => {
      setBusy(true);
      clearTimeout(t);
      t = setTimeout(() => setBusy(false), IDLE_MS);
    };
    // only real use counts: a finger that lands on the figure while scrolling the page (pointerdown on a phone)
    // must not pause it, or every scroll would restart the demo before it ever reaches the end
    const evs = ["click", "keydown", "input", "change"] as const;
    evs.forEach((ev) => el.addEventListener(ev, touch, { passive: true }));
    return () => {
      io.disconnect();
      clearTimeout(t);
      evs.forEach((ev) => el.removeEventListener(ev, touch));
    };
  }, []);

  if (!live) return null;
  return (
    <div ref={box}>
      <live.Component demo={seen && !busy} />
    </div>
  );
}
