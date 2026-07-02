import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";
import { SceneFade } from "./SceneFade";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"];
const BAR_DATA = [4, 9, 7, 14, 18, 22, 31, 38];
const LINE_POINTS = "0,90 60,78 120,72 180,58 240,50 300,38 360,28 420,16";

const AnimatedBar: React.FC<{ value: number; max: number; progress: number; label: string; delay: number }> = ({ value, max, progress, label, delay }) => {
  const barH = Math.round((value / max) * 160 * Math.max(0, Math.min(1, progress)));
  const opacity = Math.min(1, Math.max(0, progress));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
      <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: colors.navy, opacity, marginBottom: 4 }}>
        {Math.round(value * Math.max(0, Math.min(1, progress)))}
      </span>
      <div style={{ width: "100%", height: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{
          width: "65%", height: barH,
          backgroundColor: colors.accent,
          borderRadius: "6px 6px 0 0",
          opacity: 0.85 + (delay % 3) * 0.05,
          transition: "none",
        }} />
      </div>
      <span style={{ fontFamily: fonts.body, fontSize: 12, color: "#94a3b8", opacity }}>{label}</span>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [20, 0], { extrapolateRight: "clamp" });

  const cardsOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const barProgress = interpolate(frame, [50, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineProgress = interpolate(frame, [80, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const totalLength = 500;
  const dashOffset = totalLength * (1 - lineProgress);

  const maxBar = Math.max(...BAR_DATA);

  // KPI numbers animate with the bar chart progress
  const animResa  = Math.round(38  * barProgress);
  const animCouv  = Math.round(142 * barProgress);
  const animTaux  = Math.round(3   * barProgress);

  const STATS = [
    { label: "Réservations ce mois", value: animResa.toString(),        sub: "hors annulées" },
    { label: "Couverts ce mois",     value: animCouv.toString(),        sub: "hors annulées" },
    { label: "Taux d'annulation",    value: `${animTaux}%`,             sub: "sur ce mois" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FAFC", overflow: "hidden", opacity: bgOpacity }}>
      <style>{fontStyle}</style>

      {/* Navbar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        backgroundColor: colors.white,
        borderBottom: "1px solid #E8EDF2",
        height: 64,
        display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 40, gap: 48,
      }}>
        <span style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, color: colors.navy, letterSpacing: "0.04em" }}>CERYDRA</span>
        {["Configuration", "Statistiques", "Réservations"].map((item, i) => (
          <span key={item} style={{
            fontFamily: fonts.body, fontSize: 15, fontWeight: i === 1 ? 700 : 400,
            color: i === 1 ? colors.navy : "#94a3b8",
            borderBottom: i === 1 ? `2px solid ${colors.navy}` : "none",
            paddingBottom: 2,
          }}>{item}</span>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#94a3b8" }}>contact@cerydra.fr</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, bottom: 0, padding: "40px 80px" }}>
        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 28 }}>
          <h1 style={{ fontFamily: fonts.heading, fontSize: 40, fontWeight: 800, color: colors.navy, margin: 0 }}>Statistiques</h1>
        </div>

        {/* KPI cards */}
        <div style={{ display: "flex", gap: 20, marginBottom: 32, opacity: cardsOpacity }}>
          {STATS.map(({ label, value, sub }) => (
            <div key={label} style={{
              flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: "24px 28px",
              border: "1px solid #E8EDF2",
            }}>
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: fonts.heading, fontSize: 52, fontWeight: 800, color: colors.navy, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: "#94a3b8", marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "flex", gap: 24 }}>
          {/* Bar chart */}
          <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: "28px 32px", border: "1px solid #E8EDF2" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: colors.navy, marginBottom: 24 }}>
              Réservations par mois — 8 derniers mois
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
              {BAR_DATA.map((v, i) => (
                <AnimatedBar key={i} value={v} max={maxBar} progress={barProgress} label={MONTHS[i]} delay={i} />
              ))}
            </div>
          </div>

          {/* Line chart */}
          <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: "28px 32px", border: "1px solid #E8EDF2" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: colors.navy, marginBottom: 24 }}>
              Progression — couverts par mois
            </div>
            <svg width="100%" height="200" viewBox="0 0 420 110" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
                </linearGradient>
              </defs>
              {/* Area */}
              <polygon
                points={`0,90 ${LINE_POINTS} 420,110 0,110`}
                fill="url(#areaGrad)"
                opacity={lineProgress}
              />
              {/* Line */}
              <polyline
                points={LINE_POINTS}
                fill="none"
                stroke="url(#lineGrad2)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={totalLength}
                strokeDashoffset={dashOffset}
              />
              {/* Dots at each point */}
              {LINE_POINTS.split(" ").map((pt, i) => {
                const [x, y] = pt.split(",").map(Number);
                const dotOpacity = interpolate(frame, [80 + i * 18, 100 + i * 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return <circle key={i} cx={x} cy={y} r="4" fill={colors.accent} opacity={dotOpacity} />;
              })}
            </svg>
          </div>
        </div>
      </div>
      <SceneFade />
    </AbsoluteFill>
  );
};
