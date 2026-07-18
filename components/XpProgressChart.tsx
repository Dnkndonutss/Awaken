"use client";

import { useMemo, useState } from "react";
import { STAT_CATEGORY_LABELS } from "@/data/awaken-constants";
import type { ActivityEvent } from "@/hooks/use-awaken-state";
import {
  buildXpProgressSeries,
  getDateKey,
  type XpChartMetric,
  type XpChartMode,
  type XpChartRange
} from "@/lib/xp-analytics";
import type { StatCategory } from "@/types/awaken";

type XpProgressChartProps = {
  activityLog: readonly ActivityEvent[];
  xpName: string;
};

const metricOptions: { value: XpChartMetric; label: string }[] = [
  { value: "total", label: "Total XP" },
  { value: "net", label: "Net XP" },
  ...(["strength", "intelligence", "vitality", "wealth", "charisma"] as StatCategory[]).map((stat) => ({
    value: stat,
    label: STAT_CATEGORY_LABELS[stat]
  }))
];
const rangeOptions: { value: XpChartRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: "all", label: "All time" }
];

const width = 760;
const height = 330;
const margin = { top: 28, right: 22, bottom: 48, left: 62 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

export function XpProgressChart({ activityLog, xpName }: Readonly<XpProgressChartProps>) {
  const [metric, setMetric] = useState<XpChartMetric>("total");
  const [range, setRange] = useState<XpChartRange>(30);
  const [mode, setMode] = useState<XpChartMode>("daily");
  const [selectedDate, setSelectedDate] = useState<string>();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = getDateKey(new Date(), timeZone);
  const series = useMemo(
    () => buildXpProgressSeries({ activityLog, metric, range, mode, today, timeZone }),
    [activityLog, metric, mode, range, timeZone, today]
  );

  const defaultSelectedPoint = [...series.points].reverse().find((point) => point.xpGained > 0 || point.xpLost > 0) ?? series.points.at(-1);
  const selectedPoint = series.points.find((point) => point.date === selectedDate) ?? defaultSelectedPoint;
  const values = series.points.map((point) => point.value);
  let minimum = Math.min(0, ...values);
  let maximum = Math.max(0, ...values);
  if (minimum === maximum) {
    maximum = minimum + 100;
    minimum = Math.min(0, minimum - 100);
  }
  const rangeSize = Math.max(1, maximum - minimum);
  const xForIndex = (index: number) => margin.left + (series.points.length <= 1 ? plotWidth / 2 : index * plotWidth / (series.points.length - 1));
  const yForValue = (value: number) => margin.top + ((maximum - value) / rangeSize) * plotHeight;
  const linePoints = series.points.map((point, index) => `${xForIndex(index)},${yForValue(point.value)}`).join(" ");
  const tickValues = Array.from({ length: 5 }, (_, index) => minimum + (rangeSize * index) / 4).reverse();
  const labelIndexes = getLabelIndexes(series.points.length, 6);
  const metricLabel = metricOptions.find((option) => option.value === metric)?.label ?? "XP";

  return (
    <div className="xp-progress-chart mt-5 min-w-0">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-300">
          Progress type
          <select
            aria-label="XP chart progress type"
            className="rounded-md border border-white/15 bg-[#0b101b] px-3 py-2.5 text-white outline-none focus:border-cyan-200"
            onChange={(event) => setMetric(event.target.value as XpChartMetric)}
            value={metric}
          >
            {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-slate-300">Date range</legend>
          <div className="flex flex-wrap gap-2" role="group">
            {rangeOptions.map((option) => (
              <button
                aria-pressed={range === option.value}
                className={`small-button ${range === option.value ? "cyan" : ""}`}
                key={option.value}
                onClick={() => setRange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-200">
          <input
            checked={mode === "cumulative"}
            className="h-4 w-4 accent-cyan-300"
            onChange={(event) => setMode(event.target.checked ? "cumulative" : "daily")}
            type="checkbox"
          />
          Cumulative progress
        </label>
        <div aria-label="Chart legend" className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="xp-chart-legend-positive">● XP gained</span>
          <span className="xp-chart-legend-negative">● XP lost</span>
          <span className="xp-chart-legend-net">● Net progress</span>
        </div>
      </div>

      {!series.hasActivity ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
          <p className="font-semibold text-white">No XP activity in this range yet</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Complete a task or log a penalty and this chart will update automatically from your saved activity.
          </p>
        </div>
      ) : (
        <>
          {series.activeDayCount === 1 ? (
            <p className="mt-4 rounded-md bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              One active day is available. Keep logging activity to reveal a progression trend.
            </p>
          ) : null}
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-2 sm:p-4">
            <svg
              aria-label={`${metricLabel} ${mode === "cumulative" ? "cumulative" : "daily"} progression chart`}
              className="h-auto min-h-64 w-full"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
            >
              <title>{metricLabel} progression over {range === "all" ? "all time" : `the last ${range} days`}</title>
              <desc>Dates run from left to right. XP values run vertically, with penalties below the zero line.</desc>
              {tickValues.map((tick) => {
                const y = yForValue(tick);
                return (
                  <g key={tick}>
                    <line className={Math.abs(tick) < 0.001 ? "xp-chart-zero-line" : "stroke-white/10"} x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
                    <text className="fill-slate-500 text-[11px]" textAnchor="end" x={margin.left - 10} y={y + 4}>{formatCompactNumber(tick)}</text>
                  </g>
                );
              })}
              {labelIndexes.map((index) => (
                <text className="fill-slate-500 text-[10px]" key={series.points[index].date} textAnchor="middle" x={xForIndex(index)} y={height - 18}>
                  {formatShortDate(series.points[index].date)}
                </text>
              ))}
              <polyline className={`xp-chart-line ${metric === "total" ? "xp-chart-line-positive" : "xp-chart-line-net"}`} fill="none" points={linePoints} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              {series.points.map((point, index) => {
                const isSelected = point.date === selectedPoint?.date;
                const pointClass = point.value < 0 ? "xp-chart-point-negative" : metric === "net" ? "xp-chart-point-net" : "xp-chart-point-positive";
                const accessibleLabel = `${formatLongDate(point.date)}: ${formatSignedNumber(point.value)} ${xpName}. ${point.completedTasks} completed tasks.`;
                return (
                  <circle
                    aria-label={accessibleLabel}
                    className={`xp-chart-point ${pointClass} ${isSelected ? "is-selected" : ""}`}
                    cx={xForIndex(index)}
                    cy={yForValue(point.value)}
                    key={point.date}
                    onClick={() => setSelectedDate(point.date)}
                    onFocus={() => setSelectedDate(point.date)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedDate(point.date);
                      }
                    }}
                    onMouseEnter={() => setSelectedDate(point.date)}
                    r={isSelected ? 6 : 4}
                    role="button"
                    tabIndex={0}
                  />
                );
              })}
            </svg>
          </div>
          {selectedPoint ? (
            <div aria-live="polite" className="app-card mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-white">{formatLongDate(selectedPoint.date)}</p>
                <p className="text-sm font-semibold text-cyan-100">Plotted: {formatSignedNumber(selectedPoint.value)} {xpName}</p>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <ChartDetail label="XP gained" value={`+${selectedPoint.xpGained.toLocaleString()}`} tone="positive" />
                <ChartDetail label="XP lost" value={selectedPoint.xpLost ? `-${selectedPoint.xpLost.toLocaleString()}` : "0"} tone="negative" />
                <ChartDetail label="Net XP" value={formatSignedNumber(selectedPoint.netXp)} tone="net" />
                <ChartDetail label="Completed tasks" value={selectedPoint.completedTasks.toLocaleString()} />
                <ChartDetail label="Affected stats" value={selectedPoint.affectedStats.length ? selectedPoint.affectedStats.map((stat) => STAT_CATEGORY_LABELS[stat]).join(", ") : "None"} />
              </dl>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ChartDetail({ label, value, tone }: Readonly<{ label: string; value: string; tone?: "positive" | "negative" | "net" }>) {
  const toneClass = tone ? `xp-chart-detail-${tone}` : "text-white";
  return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 font-semibold ${toneClass}`}>{value}</dd></div>;
}

function getLabelIndexes(length: number, maximumLabels: number) {
  if (length <= maximumLabels) return Array.from({ length }, (_, index) => index);
  const indexes = new Set<number>([0, length - 1]);
  for (let index = 1; index < maximumLabels - 1; index += 1) indexes.add(Math.round(index * (length - 1) / (maximumLabels - 1)));
  return [...indexes].sort((first, second) => first - second);
}

function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatCompactNumber(value: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(value));
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${Math.round(value).toLocaleString()}`;
  return Math.round(value).toLocaleString();
}
