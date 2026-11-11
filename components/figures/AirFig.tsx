"use client";

import { useState } from "react";
import { AIR } from "./air-data";
import { useDemo } from "./useDemo";

/*
 * FIG: which inputs actually predict a European country's PM2.5?
 * Toggle the inputs a Ridge model may use (electricity mix, year, country) and see its score on the
 * 2019-2022 test years for all 41 countries, and one country's line against the actual values.
 * Real data and real fitted models from Nhi's ENGG2112 Europe model (see air-data.ts).
 */

type Inputs = { emit: boolean; year: boolean; country: boolean };
const NAMES: Record<keyof Inputs, string> = { emit: "Electricity mix", year: "Year", country: "Country" };
const keyOf = (i: Inputs) => (i.emit || i.year || i.country ? `${+i.emit}${+i.year}${+i.country}` : "mean");
const fromKey = (k: string): Inputs => ({ emit: k[0] === "1", year: k[1] === "1", country: k[2] === "1" });

const PERSIST = AIR.models.persist;
// chart geometry
const CW = 640, CH = 250, PL = 34, PR = 12, PT = 14, PB = 26;
const X0 = AIR.trainStart, X1 = AIR.lastYear;
const sx = (y: number) => PL + ((y - X0) / (X1 - X0)) * (CW - PL - PR);

export default function AirFig({ demo }: { demo?: boolean }) {
  const [inputs, setInputs] = useState<Inputs>({ emit: true, year: true, country: true });
  const [country, setCountry] = useState("Germany");
  const key = keyOf(inputs);
  const model = AIR.models[key];
  const hist = AIR.history[country];
  const years = AIR.testYears[country];
  const pred = model.pred[country];
  const persist = PERSIST.pred[country];

  useDemo(
    demo,
    [
      () => { setCountry("Germany"); setInputs(fromKey("100")); },
      () => setInputs(fromKey("110")),
      () => setInputs(fromKey("111")),
      () => setInputs(fromKey("011")),
      () => setCountry("Poland"),
      () => setCountry("United Kingdom"),
    ],
    2200,
  );

  const actual = hist.pm.map((v, i) => [hist.y0 + i, v] as const);
  const top = Math.ceil((Math.max(...hist.pm, ...pred, ...persist) * 1.12) / 5) * 5;
  const sy = (v: number) => PT + (1 - v / top) * (CH - PT - PB);
  const line = (pts: readonly (readonly [number, number])[]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const predPts = years.map((y, i) => [y, pred[i]] as const);
  const lastTrain = actual.find(([y]) => y === AIR.trainEnd);
  const beats = model.R2 > PERSIST.R2;
  const withE = AIR.models["111"].R2, withoutE = AIR.models["011"].R2;

  return (
    <div className="af">
      <div className="af-controls">
        <div>
          <span className="eyebrow">Inputs the model may use</span>
          <div className="rf-presets" role="group" aria-label="Model inputs">
            {(Object.keys(NAMES) as (keyof Inputs)[]).map((n) => (
              <button key={n} aria-pressed={inputs[n]} onClick={() => setInputs({ ...inputs, [n]: !inputs[n] })}>
                {inputs[n] ? "✓ " : "+ "}
                {NAMES[n]}
              </button>
            ))}
          </div>
        </div>
        <label className="af-country">
          <span className="eyebrow">Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {AIR.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="af-grid">
        <figure className="af-chart" aria-label={`PM2.5 in ${country}: actual and predicted`}>
          <svg viewBox={`0 0 ${CW} ${CH}`} role="img">
            <rect x={sx(AIR.testStart) - 8} y={PT - 6} width={sx(X1) - sx(AIR.testStart) + 16} height={CH - PT - PB + 6} className="af-test" rx="6" />
            <text x={(sx(AIR.testStart) + sx(X1)) / 2} y={PT + 6} textAnchor="middle" className="af-note">TEST</text>
            {[0, Math.round(top / 2), top].map((v) => (
              <g key={v}>
                <line x1={PL} x2={CW - PR} y1={sy(v)} y2={sy(v)} className="af-grid-line" />
                <text x={PL - 6} y={sy(v) + 3} textAnchor="end" className="af-axis">{v}</text>
              </g>
            ))}
            {[2000, 2005, 2010, 2015, AIR.testStart, X1].map((y) => (
              <text key={y} x={sx(y)} y={CH - 8} textAnchor="middle" className={`af-axis ${y % 10 === 5 ? "minor" : ""}`}>{y}</text>
            ))}
            {lastTrain && (
              <path d={`M${sx(AIR.trainEnd)},${sy(lastTrain[1])} H${sx(X1)}`} className="af-persist" />
            )}
            <path d={line(actual)} className="af-actual" />
            <path d={line(lastTrain ? [lastTrain, ...predPts] : predPts)} pathLength={1} className="af-pred" key={key + country} />
            {predPts.map(([y, v]) => (
              <circle key={y} cx={sx(y)} cy={sy(v)} r="3.5" className="af-dot" />
            ))}
          </svg>
          <figcaption className="af-legend">
            <span><i className="actual" />actual</span>
            <span><i className="pred" />predicted</span>
            <span><i className="persist" />“same as {AIR.trainEnd}”</span>
            <span>µg/m³</span>
          </figcaption>
        </figure>

        <div className="af-side">
          <div className="af-score" aria-live="polite">
            <span className="eyebrow">Test score, all {AIR.nCountries} countries</span>
            <b>R² {model.R2.toFixed(2)}</b>
            <span>off by {model.MAE.toFixed(1)} µg/m³ on average</span>
          </div>
          <p className={`af-verdict ${beats ? "ok" : ""}`}>
            {beats
              ? `Beats “same as ${AIR.trainEnd}” (R² ${PERSIST.R2.toFixed(2)}).`
              : `Doesn’t beat “same as ${AIR.trainEnd}” (R² ${PERSIST.R2.toFixed(2)}).`}
          </p>
        </div>
      </div>

      <p className="mf-why">
        Adding the electricity mix to year + country moves R² from {withoutE.toFixed(2)} to {withE.toFixed(2)}. Knowing the
        country and the trend does the work.
      </p>
    </div>
  );
}
