"use client";

import { useState } from "react";
import MigrationFig from "./MigrationFig";
import PipelineFig from "./PipelineFig";

/* Althea Room has two figures: the mobile CI/CD pipeline and the Focus database migration. */
const TABS = [
  { id: "ci", label: "CI/CD → Google Play", Component: PipelineFig },
  { id: "db", label: "DB migration · 12 tables", Component: MigrationFig },
] as const;

export default function AltheaFig({ demo }: { demo?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ci");
  return (
    <div>
      <div className="vf-tabs alt-tabs" role="tablist" aria-label="Althea Room figures">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {/* both stay mounted so switching tabs keeps each figure's progress */}
      {TABS.map(({ id, Component }) => (
        <div key={id} role="tabpanel" hidden={tab !== id}>
          <Component demo={demo && id === tab} />
        </div>
      ))}
    </div>
  );
}
