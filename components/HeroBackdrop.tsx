/**
 * Decoration behind the hero: a warm gold glow and a few thin gold threads that run in from the edges
 * and turn at right angles, like traces on a board (the weaving "threads" motif). Now and then a spark
 * of light runs along each one. Purely visual, so it is hidden from assistive tech and ignores the pointer.
 */
// Threads stay on the right half, around the preview card, so they never run under the name or the list.
const THREADS = [
  "M1400 70 H1270 q-12 0 -12 12 V120 q0 12 -12 12 H1080",
  "M1400 250 H1340 q-12 0 -12 12 V330 q0 12 -12 12 H1240",
  "M1400 520 H1290 q-12 0 -12 -12 V470 q0 -12 -12 -12 H1180",
  "M760 600 H880 q12 0 12 -12 V560 q0 -12 12 -12 H980",
  "M720 40 H820 q12 0 12 12 V90 q0 12 12 12 H900",
  "M1400 600 H1150 q-12 0 -12 -12 V575 q0 -12 -12 -12 H1040",
];

export default function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden>
      <div className="hero-glow" />
      <svg viewBox="0 0 1400 620" preserveAspectRatio="none">
        {THREADS.map((d, i) => (
          <g key={i}>
            <path d={d} className="trace" />
            <path d={d} className="trace-spark" pathLength={100} style={{ animationDelay: `${i * 1.7}s` }} />
          </g>
        ))}
      </svg>
    </div>
  );
}
