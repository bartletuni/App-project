"use client";

import { Wand2, SlidersHorizontal } from "lucide-react";
import {
  ADHESION_OPTIONS,
  CustomPrintSettings,
  INFILL_PATTERNS,
  SEAM_OPTIONS,
} from "@/lib/print-settings";

export type PrintSettingsMode = "AUTO" | "CUSTOM";

export interface PrintSettingsState {
  mode: PrintSettingsMode;
  custom: CustomPrintSettings;
}

interface PrintSettingsFieldsProps {
  value: PrintSettingsState;
  onChange: (next: PrintSettingsState) => void;
  /** Prefix for input ids so multiple forms on a page don't collide. */
  idPrefix?: string;
}

const field =
  "w-full border border-clay-500/25 bg-espresso-900/40 px-3 py-2 text-sm text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-1.5";

/**
 * Auto vs. custom slicer settings for the submission forms. Custom mode
 * exposes the standard slicer knobs: layer height, walls, infill, temps,
 * speed, adhesion, seam, ironing, and free-form extras.
 */
export default function PrintSettingsFields({
  value,
  onChange,
  idPrefix = "ps",
}: PrintSettingsFieldsProps) {
  const { mode, custom } = value;

  const setMode = (nextMode: PrintSettingsMode) => onChange({ ...value, mode: nextMode });
  const setCustom = (patch: Partial<CustomPrintSettings>) =>
    onChange({ ...value, custom: { ...custom, ...patch } });

  const num =
    (key: keyof CustomPrintSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCustom({ [key]: e.target.value === "" ? ("" as any) : Number(e.target.value) });

  const toggleBtn = (active: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 ${
      active
        ? "border-clay-400 bg-clay-500/15 text-clay-200"
        : "border-clay-500/25 text-cream-500 hover:text-cream-300 hover:border-clay-500/40"
    }`;

  return (
    <div>
      <span className={labelCls}>Print settings</span>
      <div className="flex gap-2" role="radiogroup" aria-label="Print settings mode">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "AUTO"}
          onClick={() => setMode("AUTO")}
          className={toggleBtn(mode === "AUTO")}
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" /> Auto
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "CUSTOM"}
          onClick={() => setMode("CUSTOM")}
          className={toggleBtn(mode === "CUSTOM")}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Custom
        </button>
      </div>

      {mode === "AUTO" ? (
        <p className="mt-2 text-xs text-cream-500 leading-relaxed">
          Our team will pick the optimal slicer settings for your part, material, and use case.
        </p>
      ) : (
        <div className="mt-4 space-y-4 border border-clay-500/15 bg-espresso-900/30 rounded-md p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor={`${idPrefix}-layerHeight`} className={labelCls}>
                Layer height <span className="normal-case tracking-normal">(mm)</span>
              </label>
              <input
                id={`${idPrefix}-layerHeight`}
                type="number"
                step="0.04"
                min="0.04"
                max="1"
                value={custom.layerHeight}
                onChange={num("layerHeight")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-lineWidth`} className={labelCls}>
                Line width <span className="normal-case tracking-normal">(mm)</span>
              </label>
              <input
                id={`${idPrefix}-lineWidth`}
                type="number"
                step="0.05"
                min="0.1"
                max="2"
                value={custom.lineWidth}
                onChange={num("lineWidth")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-wallCount`} className={labelCls}>
                Wall count
              </label>
              <input
                id={`${idPrefix}-wallCount`}
                type="number"
                step="1"
                min="0"
                max="20"
                value={custom.wallCount}
                onChange={num("wallCount")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-topLayers`} className={labelCls}>
                Top layers
              </label>
              <input
                id={`${idPrefix}-topLayers`}
                type="number"
                step="1"
                min="0"
                max="50"
                value={custom.topLayers}
                onChange={num("topLayers")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-bottomLayers`} className={labelCls}>
                Bottom layers
              </label>
              <input
                id={`${idPrefix}-bottomLayers`}
                type="number"
                step="1"
                min="0"
                max="50"
                value={custom.bottomLayers}
                onChange={num("bottomLayers")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-printSpeed`} className={labelCls}>
                Speed <span className="normal-case tracking-normal">(mm/s)</span>
              </label>
              <input
                id={`${idPrefix}-printSpeed`}
                type="number"
                step="5"
                min="5"
                max="600"
                value={custom.printSpeed}
                onChange={num("printSpeed")}
                className={field}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor={`${idPrefix}-infillPattern`} className={labelCls}>
                Infill pattern
              </label>
              <select
                id={`${idPrefix}-infillPattern`}
                value={custom.infillPattern}
                onChange={(e) => setCustom({ infillPattern: e.target.value as any })}
                className={field}
              >
                {INFILL_PATTERNS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-infillPercent`} className={labelCls}>
                Infill density{" "}
                <span className="text-clay-300 normal-case tracking-normal">
                  {custom.infillPercent}%
                </span>
              </label>
              <input
                id={`${idPrefix}-infillPercent`}
                type="range"
                min="0"
                max="100"
                step="5"
                value={custom.infillPercent}
                onChange={num("infillPercent")}
                className="w-full accent-clay-500 py-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${idPrefix}-nozzleTemp`} className={labelCls}>
                Nozzle temp <span className="normal-case tracking-normal">(°C)</span>
              </label>
              <input
                id={`${idPrefix}-nozzleTemp`}
                type="number"
                step="5"
                min="140"
                max="350"
                value={custom.nozzleTemp}
                onChange={num("nozzleTemp")}
                className={field}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-bedTemp`} className={labelCls}>
                Bed temp <span className="normal-case tracking-normal">(°C)</span>
              </label>
              <input
                id={`${idPrefix}-bedTemp`}
                type="number"
                step="5"
                min="0"
                max="130"
                value={custom.bedTemp}
                onChange={num("bedTemp")}
                className={field}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${idPrefix}-adhesion`} className={labelCls}>
                Plate adhesion
              </label>
              <select
                id={`${idPrefix}-adhesion`}
                value={custom.adhesion}
                onChange={(e) => setCustom({ adhesion: e.target.value as any })}
                className={field}
              >
                {ADHESION_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-seam`} className={labelCls}>
                Seam position
              </label>
              <select
                id={`${idPrefix}-seam`}
                value={custom.seam}
                onChange={(e) => setCustom({ seam: e.target.value as any })}
                className={field}
              >
                {SEAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={custom.ironing}
              onChange={(e) => setCustom({ ironing: e.target.checked })}
              className="h-4 w-4 rounded border-clay-500/40 bg-espresso-900 accent-clay-500 focus-visible:ring-2 focus-visible:ring-clay-500"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-cream-400">
              Ironing <span className="text-cream-600 normal-case tracking-normal">(smooth top surfaces)</span>
            </span>
          </label>

          <div>
            <label htmlFor={`${idPrefix}-misc`} className={labelCls}>
              Other settings <span className="text-cream-600 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id={`${idPrefix}-misc`}
              value={custom.misc || ""}
              onChange={(e) => setCustom({ misc: e.target.value })}
              rows={2}
              maxLength={1000}
              className={`${field} resize-none`}
              placeholder="e.g. fuzzy skin, variable layer height, specific slicer profile…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Read-only display of a request's saved print settings. */
export function PrintSettingsSummary({
  settings,
}: {
  settings: CustomPrintSettings | null;
}) {
  if (!settings) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-cream-300">
        <Wand2 className="h-4 w-4 text-clay-400" aria-hidden="true" />
        Auto — shop-recommended settings
      </p>
    );
  }

  const rows: [string, string][] = [
    ["Layer height", `${settings.layerHeight} mm`],
    ["Line width", `${settings.lineWidth} mm`],
    ["Walls", `${settings.wallCount}`],
    ["Top / bottom layers", `${settings.topLayers} / ${settings.bottomLayers}`],
    ["Infill", `${settings.infillPercent}% · ${settings.infillPattern}`],
    ["Nozzle / bed temp", `${settings.nozzleTemp}°C / ${settings.bedTemp}°C`],
    ["Print speed", `${settings.printSpeed} mm/s`],
    ["Plate adhesion", settings.adhesion],
    ["Seam", settings.seam],
    ["Ironing", settings.ironing ? "Yes" : "No"],
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
        {rows.map(([label, valueText]) => (
          <div key={label}>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">{label}</div>
            <div className="text-sm text-cream-200">{valueText}</div>
          </div>
        ))}
      </div>
      {settings.misc && (
        <div className="mt-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Other settings</div>
          <div className="text-sm text-cream-200 whitespace-pre-wrap">{settings.misc}</div>
        </div>
      )}
    </div>
  );
}
