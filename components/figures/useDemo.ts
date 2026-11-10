"use client";

import { useEffect, useRef } from "react";

/**
 * Autoplay for a figure's hero preview: calls steps[0], steps[1], … one per tick, looping.
 * The steps can close over the latest state, since they're read from a ref on every tick.
 */
export function useDemo(on: boolean | undefined, steps: (() => void)[], ms: number) {
  const ref = useRef(steps);
  ref.current = steps;
  useEffect(() => {
    if (!on) return;
    // respect "reduce motion": show the figure, but don't animate it
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    ref.current[0]?.();
    const id = setInterval(() => {
      i = (i + 1) % ref.current.length;
      ref.current[i]();
    }, ms);
    return () => clearInterval(id);
  }, [on, ms]);
}
