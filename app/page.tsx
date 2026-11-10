import Link from "next/link";
import AskNhi from "@/components/AskNhi";
import FigureFrame from "@/components/FigureFrame";
import HeroShowcase from "@/components/HeroShowcase";
import Reveal from "@/components/Reveal";
import Timeline from "@/components/Timeline";
import { getGraph, getProfile, getProjects, type Item } from "@/lib/content";

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="item-list">
      {items.map((it) => (
        <li key={it.title}>
          <b>{it.title}</b>
          {it.sub && <span>{it.sub}</span>}
          {it.note && <small>{it.note}</small>}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const profile = getProfile();
  const projects = getProjects();
  const graph = getGraph();
  const [first, ...rest] = profile.name.split(" ");

  return (
    <main>
      {/* 1. Hero */}
      <HeroShowcase
        graph={graph}
        name={
          <>
            <h1 className="display hero-name">
              {first} {rest.slice(0, -1).join(" ")}
              <br />
              <span>{rest.at(-1)}</span>
            </h1>
            <p className="hero-role">Software Engineer · University of Sydney</p>
            <div className="hero-links">
              <a className="hero-cv" href="/Vo_Xuan_Nhi_Tran_CV.pdf" target="_blank" rel="noopener">
                Resume <span aria-hidden>↓</span>
              </a>
              <a href={profile.links.github} target="_blank" rel="noopener">GitHub ↗</a>
              <a href={profile.links.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
            </div>
          </>
        }
        items={projects.map((p) => ({
          id: p.id,
          name: (p.type === "experience" ? p.org?.replace(/ LLC$/, "") : p.title) ?? p.title,
          tagline: p.tagline,
          current: p.type === "experience",
        }))}
      />

      {/* 2. About */}
      <section id="about" className="about" aria-label="About">
        <div className="section-bar"><span>About</span><span>{profile.location}</span></div>
        <div className="about-text prose-lg" dangerouslySetInnerHTML={{ __html: profile.html }} />
        <dl className="facts">
          {profile.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>
                <b>{f.value}</b>
                {f.sub && <span>{f.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3. Ask Nhi */}
      <section id="ask" aria-labelledby="ask-title">
        <div className="section-bar"><span>Ask Nhi</span><span>AI assistant</span></div>
        <header className="ask-intro">
          <h2 id="ask-title" className="ask-title">
            Ask anything about <em>my work.</em>
          </h2>
          <p className="ask-lede">
            Type a question or pick one below. An AI assistant answers from my projects and experience, and the graph lights up the parts it used.
          </p>
        </header>
        <AskNhi graph={graph} />
      </section>

      {/* 4. Work */}
      <section id="work" aria-label="Work">
        <div className="section-bar"><span>Work</span><span>Industry and projects</span></div>
        {projects.map((p, i) => (
          <article key={p.id} id={p.id} className="work">
            <header className="work-head">
              <div>
                <h2 className="work-title">{p.type === "experience" ? p.org : p.title}</h2>
                <p className="work-sub">{p.type === "experience" ? p.title : p.subtitle}</p>
              </div>
              <p className="work-when">
                {p.period.replace(/Present/i, "now")}
                {p.location && <><br />{p.location}</>}
              </p>
            </header>
            <div className="work-body">
              <p className="work-summary">{p.summary}</p>
              <div>
                <ul className="work-points">
                  {p.highlights.slice(0, 4).map((h, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: h }} />
                  ))}
                </ul>
                {p.stack.length > 0 && <p className="work-tags">{p.stack.join(" · ")}</p>}
                <p className="work-links">
                  <Link href={`/work/${p.id}`} className="work-more">Read the case study ↗</Link>
                  {p.links.live && <a href={p.links.live} className="work-more" target="_blank" rel="noopener">Live demo ↗</a>}
                  {p.links.repo && <a href={p.links.repo} className="work-more" target="_blank" rel="noopener">Code ↗</a>}
                </p>
              </div>
            </div>
            {p.figure && <FigureFrame figure={p.figure} n={i + 2} />}
          </article>
        ))}
      </section>

      {/* 5. Experience */}
      <section id="experience" aria-label="Experience">
        <div className="section-bar"><span>Experience</span><span>Since 2024</span></div>
        <Timeline />
      </section>

      {/* 6. Education / Recognition / Toolkit */}
      <section className="triple" aria-label="Education, recognition and toolkit">
        <div>
          <h3 className="eyebrow">Education</h3>
          <ItemList items={profile.education} />
        </div>
        <div>
          <h3 className="eyebrow">Recognition</h3>
          <ItemList items={profile.recognition} />
        </div>
        <div>
          <h3 className="eyebrow">Toolkit</h3>
          <ItemList items={profile.toolkit} />
        </div>
      </section>

      {/* 7. Contact */}
      <section id="contact" className="contact" aria-label="Contact">
        <div className="section-bar"><span>Contact</span><span>Email is best</span></div>
        <p className="contact-lede">
          Looking for a {profile.looking_for.toLowerCase()}. Happy to talk about backend, AI products, or anything on this page.
        </p>
        <a className="contact-big" href={`mailto:${profile.links.email}`}>{profile.links.email} ↗</a>
        <p className="contact-links">
          <a href={`mailto:${profile.links.email}`}>Email ↗</a>
          <a href={profile.links.linkedin}>LinkedIn ↗</a>
          <a href={profile.links.github}>GitHub ↗</a>
        </p>
      </section>
      <Reveal />
    </main>
  );
}
