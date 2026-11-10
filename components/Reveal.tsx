"use client";

import { useEffect } from "react";

/**
 * Fades each page section in as it scrolls into view. Sections stay visible without JavaScript or with
 * reduced motion: the hidden starting state only applies once <html> has the "reveal" class set here.
 */
export default function Reveal({ selector = "main > section:not(.hero)" }: { selector?: string }) {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...document.querySelectorAll<HTMLElement>(selector)];
    // anything already on screen when the page loads shows at once
    const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    below.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector]);
  return null;
}
