"use client";

import { useEffect, useRef, useState } from "react";
import { useDemo } from "./useDemo";

/*
 * FIG: the data cleaning in Nhi's ENGG2112 project, step by step, as a spreadsheet.
 * Each step is one real line of scripts/data_processing.py. The rows are real rows from the two
 * source files (World Energy Consumption + average-exposure-pm25-pollution); the shares are % of electricity.
 */

type Tone = "src" | "new" | "gone";
type Col = { label: string; num?: boolean; tone?: Tone };
type Cell = string | number | null;
type Row = { cells: Cell[]; drop?: string; tone?: "new" };
// focus: the columns this step is about; they stay bright and the rest of the sheet dims
type Sheet = { file: string; cols: Col[]; rows: Row[]; more?: boolean; focus?: number[]; headOnly?: boolean };

// energy rows: country, year, [coal, gas, oil], [hydro, nuclear, solar, wind, other renewables], emit sum, clean sum
const E: [string, number, Cell[], Cell[], Cell, Cell][] = [
  ["Sweden", 2019, [0.125, 0.172, 1.692], [38.814, 39.265, 0.404, 11.786, 7.743], 1.989, 98.012],
  ["Norway", 2019, [0.03, 1.539, 0.493], [93.619, 0, 0.007, 4.125, 0.187], 2.062, 97.938],
  ["Poland", 2003, [93.767, 1.613, 3.12], [1.113, 0, 0, 0.08, 0.307], 98.5, 1.5],
  ["Australia", 1999, [82.727, 7.793, 0.849], [7.869, 0, 0.02, 0.021, 0.548], 91.369, 8.458],
  ["South Sudan", 2019, [0, 0, 100], [0, 0, 0, 0, 0], 100, 0],
  ["Afghanistan", 1990, [null, null, null], [null, null, null, null, null], null, null],
  ["Asia", 2019, [52.729, 17.943, 3.253], [13.524, 4.575, 2.686, 3.594, 1.695], 73.925, 26.074],
];
// PM2.5 rows: Entity, Code, Year, mean annual exposure (µg/m³)
const P: [string, string, number, number][] = [
  ["Sweden", "SWE", 2019, 5.99],
  ["Norway", "NOR", 2019, 6.15],
  ["Poland", "POL", 2003, 30.58],
  ["Australia", "AUS", 1999, 6.16],
  ["South Sudan", "SSD", 2019, 24.23],
  ["Afghanistan", "AFG", 1990, 48.43],
  ["Monaco", "MCO", 2019, 12.56],
];
const pm = (c: string) => P.find((p) => p[0] === c)?.[3] ?? null;

const ENERGY_FILE = "World Energy Consumption.csv";
const PM_FILE = "average-exposure-pm25-pollution.csv";
const EMIT = ["coal", "gas", "oil"].map((s) => `${s}_share_elec`);
const CLEAN = ["hydro", "nuclear", "solar", "wind", "other_renewables"].map((s) => `${s}_share_elec`);
const C = { country: { label: "country" }, year: { label: "year", num: true } };
const SUMS = (tone?: Tone): Col[] => [
  { label: "% GHG emitting source", num: true, tone },
  { label: "% GHG non emitting source", num: true, tone },
];
const PM_COL: Col = { label: "PM2.5 Exposure", num: true };
const merged = (rows: typeof E, drops: Record<string, string>): Row[] =>
  rows.map(([c, y, , , e, k]) => ({ cells: [c, y, e, k, pm(c)], drop: drops[c] }));

const rawEnergy = (sums: boolean): Sheet => ({
  file: ENERGY_FILE,
  more: true,
  focus: sums ? [10, 11] : undefined,
  cols: [
    C.country,
    C.year,
    ...EMIT.map((label) => ({ label, num: true, tone: sums ? ("src" as const) : undefined })),
    ...CLEAN.map((label) => ({ label, num: true })),
    ...(sums ? SUMS("new") : []),
  ],
  rows: E.map(([c, y, emit, clean, e, k]) => ({ cells: [c, y, ...emit, ...clean, ...(sums ? [e, k] : [])] })),
});

const STEPS: { title: string; what: string; code: string; status: string; sheets: Sheet[] }[] = [
  {
    title: "Read both files",
    what: "Two public datasets: each country’s electricity mix by year, and its average PM2.5 exposure.",
    code: "energy_df = pd.read_csv(energy_path)\npm25_df = pd.read_csv(pm25_path)",
    status: `${PM_FILE}: 7,242 rows`,
    sheets: [
      rawEnergy(false),
      {
        file: PM_FILE,
        cols: [{ label: "Entity" }, { label: "Code" }, { label: "Year", num: true }, { label: "PM2.5 air pollution, mean annual exposure (micrograms per cubic meter)", num: true }],
        rows: P.map((r) => ({ cells: r })),
      },
    ],
  },
  {
    title: "Add up the shares",
    what: "Coal + gas + oil becomes one ‘emitting’ column, the rest one ‘non emitting’. Afghanistan 1990 has no shares, so it stays blank.",
    code: "energy_df['% GHG emitting source'] = energy_df[emitting_cols].sum(axis=1, min_count=1)\nenergy_df['% GHG non emitting source'] = energy_df[clean_cols].sum(axis=1, min_count=1)",
    status: "2 columns added",
    sheets: [rawEnergy(true)],
  },
  {
    title: "Keep 4 columns, rename",
    what: "Keep only what the model needs, and give the PM2.5 file the same column names so the two can be joined.",
    code: "energy_subset = energy_df[['country', 'year', '% GHG emitting source', '% GHG non emitting source']]\npm25_df = pm25_df.rename(columns={'Entity': 'country', 'Year': 'year', 'PM2.5 air pollution, …': 'PM2.5 Exposure'})",
    status: "same keys in both: country + year",
    sheets: [
      { file: "energy_subset", cols: [C.country, C.year, ...SUMS()], rows: E.map(([c, y, , , e, k]) => ({ cells: [c, y, e, k] })) },
      {
        file: "pm25_df",
        focus: [0, 1, 2, 3],
        headOnly: true, // only the column names change here
        cols: [{ label: "country", tone: "new" }, { label: "Code", tone: "gone" }, { label: "year", num: true, tone: "new" }, { ...PM_COL, tone: "new" }],
        rows: P.map((r) => ({ cells: r })),
      },
    ],
  },
  {
    title: "Join on country + year",
    what: "An inner join keeps a row only if both files have it. Asia is a region with no PM2.5 row, and Monaco has no energy row.",
    code: "merged_df = pd.merge(energy_subset, pm25_df[['country', 'year', 'PM2.5 Exposure']],\n                     on=['country', 'year'], how='inner')",
    status: "one table, 5 columns",
    sheets: [
      {
        file: "merged_df",
        focus: [4],
        cols: [C.country, C.year, ...SUMS(), { ...PM_COL, tone: "new" }],
        rows: [
          ...merged(E.slice(0, 6), {}),
          { cells: ["Asia", 2019, 73.925, 26.074, null], drop: "no PM2.5 row" },
          { cells: ["Monaco", 2019, null, null, 12.56], drop: "no energy row" },
        ],
      },
    ],
  },
  {
    title: "Drop blank rows",
    what: "A row with any blank value can’t be used for training, so Afghanistan 1990 goes.",
    code: "clean_merged = merged_df.dropna(subset=['% GHG emitting source',\n                                        '% GHG non emitting source', 'PM2.5 Exposure'])",
    status: "no blanks left",
    sheets: [{ file: "clean_merged", cols: [C.country, C.year, ...SUMS(), PM_COL], rows: merged(E.slice(0, 6), { Afghanistan: "blank shares" }) }],
  },
  {
    title: "Keep countries with ≥ 15 years",
    what: "A country with only a few years has no trend to learn from. South Sudan has 12 usable years, so all of its rows go.",
    code: "valid_years_per_country = clean_merged.groupby('country').size()\ncountries_to_keep = valid_years_per_country[valid_years_per_country >= min_valid_years].index",
    status: "min_valid_years = 15",
    sheets: [{ file: "clean_merged", cols: [C.country, C.year, ...SUMS(), PM_COL], rows: merged(E.slice(0, 5), { "South Sudan": "only 12 years" }) }],
  },
  {
    title: "Save the clean table",
    what: "The cleaned table the models train on.",
    code: "final_df.to_csv(ROOT / 'data' / 'processed' / 'cleaned_climate_merged.csv', index=False)",
    status: "4,997 rows · 196 countries · 5 columns",
    sheets: [{ file: "cleaned_climate_merged.csv", cols: [C.country, C.year, ...SUMS(), PM_COL], rows: merged(E.slice(0, 4), {}) }],
  },
];

const letter = (i: number) => String.fromCharCode(65 + i);
const show = (v: Cell) => (v === null ? "" : String(v));

function Grid({ sheet, step }: { sheet: Sheet; step: number }) {
  const notes = sheet.rows.some((r) => r.drop);
  const hot = (i: number) => sheet.focus?.includes(i) ?? false;
  const scroller = useRef<HTMLDivElement>(null);
  const added = sheet.cols.findIndex((c) => c.tone === "new");
  // a wide sheet: when this step adds columns at the far right, scroll them into view
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const far = added > 2 && el.scrollWidth > el.clientWidth;
    el.scrollTo({ left: far ? el.scrollWidth : 0, behavior: "smooth" });
  }, [step, added]);
  return (
    <div className="cf-sheet">
      <div className="cf-file">{sheet.file}</div>
      <div className="cf-scroll" ref={scroller}>
        <table className={`cf-grid ${sheet.focus && !sheet.headOnly ? "focus" : ""}`}>
          <thead>
            <tr>
              <th className="cf-corner" aria-hidden />
              {sheet.cols.map((c, i) => (
                <th key={i} className={`${c.tone ?? ""} ${hot(i) ? "hot" : ""}`}>{letter(i)}</th>
              ))}
              {sheet.more && <th className="cf-ghost">…</th>}
              {notes && <th className="cf-blank" />}
            </tr>
          </thead>
          <tbody>
            <tr className="cf-names">
              <th>1</th>
              {sheet.cols.map((c, i) => (
                <td key={i} className={`${c.tone ?? ""} ${c.num ? "num" : ""} ${hot(i) ? "hot" : ""}`} title={c.label}>
                  {c.label}
                </td>
              ))}
              {sheet.more && <td className="cf-ghost">more columns</td>}
              {notes && <td className="cf-blank" />}
            </tr>
            {sheet.rows.map((r, j) => (
              <tr key={`${step}-${r.cells[0]}`} className={r.drop ? "drop" : ""}>
                <th>{j + 2}</th>
                {r.cells.map((v, i) => (
                  <td key={i} className={`${sheet.cols[i].tone ?? ""} ${sheet.cols[i].num ? "num" : ""} ${hot(i) && !sheet.headOnly ? "hot" : ""}`}>
                    {show(v)}
                  </td>
                ))}
                {sheet.more && <td className="cf-ghost" />}
                {notes && (
                  <td className="cf-blank">
                    {r.drop ? <span className="cf-why">✕ {r.drop}</span> : <span className="cf-ok">✓ kept</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CleaningFig({ demo }: { demo?: boolean }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  useDemo(demo, STEPS.map((_, i) => () => setStep(i)), 2600);

  return (
    <div className="cf">
      <ol className="cf-steps" aria-label="Cleaning steps">
        {STEPS.map((t, i) => (
          <li key={i}>
            <button aria-pressed={i === step} aria-label={t.title} onClick={() => setStep(i)} className={i < step ? "done" : ""}>
              <b>{i + 1}</b>
              <span>{t.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="cf-book">
        <div className="cf-fx" key={`fx${step}`}>
          <span>fx</span>
          <code>{s.code}</code>
        </div>
        <div className="cf-sheets" key={step}>
          {s.sheets.map((sh) => (
            <Grid key={sh.file} sheet={sh} step={step} />
          ))}
        </div>
        <div className="cf-status">
          <span>{s.status}</span>
          <span>real rows, a sample</span>
        </div>
      </div>

      <div className="cf-foot">
        <p className="mf-why" aria-live="polite">
          <b>{step + 1}. {s.title}.</b> {s.what}
        </p>
        <div className="cf-nav">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous step">←</button>
          <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1} aria-label="Next step">→</button>
        </div>
      </div>
    </div>
  );
}
