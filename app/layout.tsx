import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "@/design/tokens.css";
import "./globals.css";

// Self-hosted at build time by next/font (no request to Google from visitors).
const display = Cormorant_Garamond({ subsets: ["latin", "vietnamese"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--nf-display" });
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--nf-body" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "Nhi Tran · Software Engineer",
  description: "Portfolio of Vo Xuan Nhi Tran, Software Engineering student at the University of Sydney.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="page">
          <header className="site-head">
            <Link href="/" className="mark">Nhi Tran</Link>
            <nav aria-label="Main">
              <Link href="/#work">Work</Link>
              <Link href="/#ask">Ask</Link>
              <Link href="/#experience">Experience</Link>
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
