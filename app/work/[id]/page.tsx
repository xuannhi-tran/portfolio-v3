import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FigureFrame from "@/components/FigureFrame";
import { getProject, getProjects } from "@/lib/content";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getProjects().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProject((await params).id);
  return { title: p ? `${p.title} · Nhi Tran` : "Not found" };
}

export default async function CaseStudy({ params }: Props) {
  const p = getProject((await params).id);
  if (!p) notFound();

  const heading = p.type === "experience" ? p.org : p.title;
  const sub = p.type === "experience" ? `${p.title} · ${p.location}` : p.subtitle;

  return (
    <main>
      <header className="case-head">
        <Link href="/#work" className="back">← ALL WORK</Link>
        <h1 className="display">{heading}</h1>
        <p className="lede">{sub}</p>
        <div className="case-meta">
          <span className="eyebrow">{p.period}</span>
          {p.links.live && <a className="eyebrow" href={p.links.live}>Live ↗</a>}
          {p.links.repo && <a className="eyebrow" href={p.links.repo}>Code ↗</a>}
        </div>
        {p.stack.length > 0 && (
          <ul className="chips on-dark">
            {p.stack.map((s) => (
              <li key={s} className="chip">{s}</li>
            ))}
          </ul>
        )}
      </header>

      {p.figure && <FigureFrame figure={p.figure} n={2} />}

      <article className="prose" dangerouslySetInnerHTML={{ __html: p.html }} />
    </main>
  );
}
