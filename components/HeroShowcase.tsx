import type { Graph } from "@/lib/content";
import GraphMini from "@/components/GraphMini";
import HeroBackdrop from "@/components/HeroBackdrop";

export type HeroItem = { id: string; name: string; tagline?: string; current: boolean };

/** Hero: name and the featured project list on the left, the mini skill graph on the right. */
export default function HeroShowcase({ items, graph, name }: { items: HeroItem[]; graph: Graph; name: React.ReactNode }) {
  return (
    <section className="hero">
      <HeroBackdrop />
      <div className="hero-text">
        {name}
        <ul className="featured">
          {items.map((p) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>
                <b>{p.name}</b>
                {p.current && <i className="live-dot" aria-label="current" />}
                <span>{p.tagline}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <GraphMini graph={graph} />
    </section>
  );
}
