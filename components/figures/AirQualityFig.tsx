"use client";

import { useState } from "react";
import AirFig from "./AirFig";
import CleaningFig from "./CleaningFig";

/* Air Quality Model has two figures: the data cleaning as a spreadsheet, then the Europe model. */
const TABS = [
  { id: "clean", label: "Data cleaning", Component: CleaningFig },
  { id: "model", label: "Europe model · R²", Component: AirFig },
] as const;

export default function AirQualityFig({ demo }: { demo?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("clean");
  return (
    <div>
      <div className="vf-tabs alt-tabs" role="tablist" aria-label="Air Quality Model figures">
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
