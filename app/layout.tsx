import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "@/design/tokens.css";
import "./globals.css";

// Self-hosted at build time by next/font (no request to Google from visitors).
const display = Cormorant_Garamond({ subsets: ["latin", "vietnamese"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--nf-display" });
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--nf-body" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], variable: "--nf-mono" });

const description = "Portfolio of Vo Xuan Nhi Tran, Software Engineering student at the University of Sydney. Ask Nhi anything: a RAG chatbot that answers from Nhi’s work, with sources.";

export const metadata: Metadata = {
  title: { default: "Vo Xuan Nhi Tran", template: "%s · Vo Xuan Nhi Tran" },
  description,
  openGraph: { title: "Vo Xuan Nhi Tran", description, type: "website", locale: "en_AU", siteName: "Vo Xuan Nhi Tran" },
  twitter: { card: "summary_large_image", title: "Vo Xuan Nhi Tran", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="page">
          <header className="site-head">
            <Link href="/" className="mark">Vo Xuan Nhi Tran</Link>
            <nav aria-label="Main">
              <Link href="/#experience">Experience</Link>
              <Link href="/#projects">Projects</Link>
              <Link href="/#ask">Ask</Link>
              <Link href="/#contact">Contact</Link>
            </nav>
          </header>
          {children}
          <footer className="site-foot">
            <span>© {new Date().getFullYear()} Vo Xuan Nhi Tran · Sydney</span>
            <span>
              <a href="https://github.com/xuannhi-tran">GitHub</a> ·{" "}
              <a href="https://linkedin.com/in/xuannhi-tran">LinkedIn</a>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
