import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { BreakdownRow, WrappedData } from "~/lib/types";
import { moneyCompact, moneyFull, monthName, num, pct } from "~/lib/format";

interface Slide {
  id: string;
  accent: string;
  content: ReactNode;
}

const ACCENTS = ["#6d5efc", "#e0457b", "#f5a623", "#12b886", "#3aa0ff", "#c74bd6"];

function Bars({ rows }: { rows: BreakdownRow[] }) {
  const max = Math.max(...rows.map((r) => r.volume), 1);
  return (
    <div className="wrap-bars">
      {rows.map((r, i) => (
        <div className="wrap-bar-row" key={r.label} style={{ animationDelay: `${0.15 * i + 0.2}s` }}>
          <div className="wrap-bar-head">
            <span className="wrap-bar-label">
              <span className="wrap-bar-rank">{i + 1}</span>
              {r.label}
            </span>
            <span className="wrap-bar-val">{moneyCompact(r.volume)}</span>
          </div>
          <div className="wrap-bar-track">
            <div className="wrap-bar-fill" style={{ width: `${(r.volume / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ big, label, sub }: { big: string; label: string; sub?: string }) {
  return (
    <div className="wrap-stat">
      <p className="wrap-stat-label">{label}</p>
      <p className="wrap-stat-big">{big}</p>
      {sub ? <p className="wrap-stat-sub">{sub}</p> : null}
    </div>
  );
}

function buildSlides(data: WrappedData): Slide[] {
  const slides: Slide[] = [];
  const push = (id: string, content: ReactNode) =>
    slides.push({ id, accent: ACCENTS[slides.length % ACCENTS.length] ?? "#6d5efc", content });

  push(
    "volume",
    <Stat
      label={`In ${data.meta.year}, you originated`}
      big={moneyCompact(data.headline.volume)}
      sub={`${moneyFull(data.headline.volume)} in total volume`}
    />,
  );
  push("units", <Stat label="Across" big={num(data.headline.units)} sub="loans funded" />);
  push(
    "avg",
    <Stat label="Your average loan" big={moneyCompact(data.headline.avgLoan)} sub={moneyFull(data.headline.avgLoan)} />,
  );

  if (data.biggestMonth) {
    push(
      "biggest",
      <Stat
        label="Your biggest month"
        big={monthName(data.biggestMonth.date)}
        sub={`${moneyCompact(data.biggestMonth.volume)} · ${num(data.biggestMonth.units)} loans`}
      />,
    );
  }

  if (data.yoy.volumeGrowthPct !== null) {
    const up = data.yoy.volumeGrowthPct >= 0;
    push(
      "yoy",
      <Stat
        label={up ? "You grew your volume" : "Year over year"}
        big={`${up ? "+" : ""}${pct(data.yoy.volumeGrowthPct)}`}
        sub={`vs ${moneyCompact(data.yoy.volumePrev)} the year before`}
      />,
    );
  }

  if (data.topStates.length > 0) {
    push(
      "states",
      <div className="wrap-list-slide">
        <p className="wrap-stat-label">Where you lent</p>
        <Bars rows={data.topStates} />
      </div>,
    );
  }
  if (data.topCities.length > 0) {
    push(
      "cities",
      <div className="wrap-list-slide">
        <p className="wrap-stat-label">Your top cities</p>
        <Bars rows={data.topCities} />
      </div>,
    );
  }
  if (data.topLenders.length > 0) {
    const top = data.topLenders[0]!;
    push(
      "lenders",
      <div className="wrap-list-slide">
        <p className="wrap-stat-label">
          Your go-to lender was <strong>{top.label}</strong>
        </p>
        <Bars rows={data.topLenders} />
      </div>,
    );
  }

  const pv = data.mix.purchaseVolume ?? 0;
  const rv = data.mix.refinanceVolume ?? 0;
  if (pv > 0 || rv > 0) {
    const total = pv + rv;
    push(
      "mix",
      <div className="wrap-list-slide">
        <p className="wrap-stat-label">Purchase vs. refinance</p>
        <div className="wrap-mix">
          <div className="wrap-mix-bar">
            <div className="wrap-mix-purchase" style={{ width: `${(pv / total) * 100}%` }} />
            <div className="wrap-mix-refi" style={{ width: `${(rv / total) * 100}%` }} />
          </div>
          <div className="wrap-mix-legend">
            <span>
              <i className="dot dot-p" /> Purchase {pct(pv / total)}
            </span>
            <span>
              <i className="dot dot-r" /> Refi {pct(rv / total)}
            </span>
          </div>
        </div>
      </div>,
    );
  }

  push(
    "outro",
    <div className="wrap-outro">
      <p className="wrap-stat-label">That was your {data.meta.year}</p>
      <h2 className="wrap-outro-name">{data.meta.name}</h2>
      <p className="wrap-outro-foot">Powered by Model Match</p>
    </div>,
  );

  return slides;
}

export function Slides({ data }: { data: WrappedData }) {
  const slides = useMemo(() => buildSlides(data), [data]);
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  const next = useCallback(() => setI((n) => Math.min(n + 1, last)), [last]);
  const prev = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (x < e.currentTarget.clientWidth * 0.35) prev();
    else next();
  };

  const slide = slides[i] ?? slides[0];
  if (!slide) return null;

  return (
    <div className="wrap-shell wrap-story" style={{ background: gradient(slide.accent) }} onClick={onClick}>
      <div className="wrap-progress">
        {slides.map((s, idx) => (
          <div className="wrap-progress-seg" key={s.id}>
            <div className="wrap-progress-fill" style={{ width: idx <= i ? "100%" : "0%" }} />
          </div>
        ))}
      </div>
      <div className="wrap-slide" key={slide.id}>
        {slide.content}
      </div>
      {data.meta.demo ? <span className="wrap-demo-tag">demo data</span> : null}
    </div>
  );
}

function gradient(accent: string): string {
  return `radial-gradient(120% 120% at 50% 0%, ${accent}33 0%, #0b1020 55%, #06070f 100%)`;
}
