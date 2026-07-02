import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";
import { SceneFade } from "./SceneFade";

const RESERVATIONS = [
  { name: "Idriss Ali",        date: "Ven. 26 juin", time: "20h30", covers: 2, statut: "confirmée" },
  { name: "Marie Leclerc",    date: "Dim. 29 juin", time: "12h30", covers: 4, statut: "confirmée" },
  { name: "Thomas Bernard",   date: "Lun. 30 juin", time: "19h00", covers: 3, statut: "en attente" },
  { name: "Sophie Renaud",    date: "Mar. 1 juil.", time: "20h00", covers: 6, statut: "confirmée" },
  { name: "Lucas Petit",      date: "Mer. 2 juil.", time: "19h30", covers: 2, statut: "confirmée" },
  { name: "Camille Morin",    date: "Jeu. 3 juil.", time: "20h30", covers: 5, statut: "confirmée" },
];

const STATUT_STYLE: Record<string, { bg: string; text: string }> = {
  "confirmée":  { bg: "#D1FAE5", text: "#059669" },
  "en attente": { bg: "#FEF3C7", text: "#D97706" },
};

const ReservationRow: React.FC<{ r: typeof RESERVATIONS[0]; frame: number; startFrame: number }> = ({ r, frame, startFrame }) => {
  const f = Math.max(0, frame - startFrame);
  const opacity = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, 22], [40, 0], { extrapolateRight: "clamp" });
  const st = STATUT_STYLE[r.statut] || STATUT_STYLE["confirmée"];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 80px 80px 120px",
      gap: 16,
      padding: "16px 28px",
      borderBottom: "1px solid #F1F5F9",
      alignItems: "center",
      opacity,
      transform: `translateX(${x}px)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: `${colors.navy}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 700, color: colors.navy }}>
            {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        </div>
        <span style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 600, color: colors.navy }}>{r.name}</span>
      </div>
      <span style={{ fontFamily: fonts.body, fontSize: 15, color: colors.navy, opacity: 0.55 }}>{r.date}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 700, color: colors.navy }}>{r.time}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 15, color: colors.navy, opacity: 0.65 }}>{r.covers} pers.</span>
      <div style={{ backgroundColor: st.bg, borderRadius: 20, padding: "5px 14px", display: "inline-block" }}>
        <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: st.text }}>{r.statut}</span>
      </div>
    </div>
  );
};

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1 (0–90f): motivational text
  const motifOpacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const motifScale = interpolate(frame, [0, 20], [0.95, 1], { extrapolateRight: "clamp" });

  // Phase 2 (90–420f): dashboard
  const dashOpacity = interpolate(frame, [90, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const navbarSlide = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 22, stiffness: 90 }, from: -80, to: 0 });
  const titleOpacity = interpolate(frame, [100, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Counter animation
  const countProgress = interpolate(frame, [120, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reservCount = Math.round(countProgress * 6);
  const couvCount = Math.round(countProgress * 22);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <style>{fontStyle}</style>

      {/* ── Phase 1: Texte motivationnel ── */}
      <AbsoluteFill style={{
        backgroundColor: colors.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: motifOpacity,
        zIndex: 10,
        pointerEvents: "none",
      }}>
        <div style={{ textAlign: "center", transform: `scale(${motifScale})` }}>
          <div style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 600, color: colors.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 24, opacity: 0.9 }}>
            Votre objectif
          </div>
          <div style={{ fontFamily: fonts.heading, fontSize: 80, fontWeight: 800, color: colors.white, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Facilitez votre vie
          </div>
          <div style={{ fontFamily: fonts.heading, fontSize: 80, fontWeight: 800, color: colors.accent, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 36 }}>
            et celle de vos clients
          </div>
          <div style={{ width: 80, height: 4, backgroundColor: colors.accent, borderRadius: 2, margin: "0 auto" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 1000px 500px at 50% 50%, ${colors.accent}12, transparent 70%)` }} />
      </AbsoluteFill>

      {/* ── Phase 2: Dashboard ── */}
      <AbsoluteFill style={{ backgroundColor: "#F8FAFC", opacity: dashOpacity }}>
        {/* Navbar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          backgroundColor: colors.white,
          borderBottom: "1px solid #E8EDF2",
          height: 64,
          display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 40,
          gap: 48,
          transform: `translateY(${navbarSlide - 80}px)`,
          zIndex: 5,
        }}>
          <span style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, color: colors.navy, letterSpacing: "0.04em" }}>CERYDRA</span>
          {["Configuration", "Statistiques", "Réservations"].map((item, i) => (
            <span key={item} style={{
              fontFamily: fonts.body, fontSize: 15, fontWeight: i === 2 ? 700 : 400,
              color: i === 2 ? colors.navy : "#94a3b8",
              borderBottom: i === 2 ? `2px solid ${colors.navy}` : "none",
              paddingBottom: 2,
            }}>{item}</span>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#94a3b8" }}>contact@cerydra.fr</span>
          </div>
        </div>

        {/* Main */}
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, bottom: 0, padding: "40px 80px" }}>
          {/* Header */}
          <div style={{ opacity: titleOpacity, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: fonts.heading, fontSize: 40, fontWeight: 800, color: colors.navy, margin: 0 }}>Réservations</h1>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ backgroundColor: colors.navy, borderRadius: 12, padding: "10px 20px" }}>
                <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.white }}>Toutes · {reservCount}</span>
              </div>
              <div style={{ backgroundColor: colors.white, border: "1px solid #E8EDF2", borderRadius: 12, padding: "10px 20px" }}>
                <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#94a3b8" }}>À venir · {reservCount}</span>
              </div>
            </div>
          </div>

          {/* Stats mini row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, opacity: titleOpacity }}>
            {[
              { label: "Réservations", value: reservCount.toString() },
              { label: "Couverts", value: couvCount.toString() },
            ].map(({ label, value }) => (
              <div key={label} style={{
                backgroundColor: colors.white, borderRadius: 14, padding: "16px 24px",
                border: "1px solid #E8EDF2", display: "flex", alignItems: "center", gap: 16,
              }}>
                <span style={{ fontFamily: fonts.heading, fontSize: 36, fontWeight: 800, color: colors.navy }}>{value}</span>
                <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#94a3b8" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ backgroundColor: colors.white, borderRadius: 18, border: "1px solid #E8EDF2", overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 80px 80px 120px",
              gap: 16,
              padding: "14px 28px",
              backgroundColor: "#F8FAFC",
              borderBottom: "1px solid #E8EDF2",
              opacity: titleOpacity,
            }}>
              {["Client", "Date", "Heure", "Couverts", "Statut"].map((h) => (
                <span key={h} style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
              ))}
            </div>
            {RESERVATIONS.map((r, i) => (
              <ReservationRow key={i} r={r} frame={frame} startFrame={130 + i * 28} />
            ))}
          </div>
        </div>
      </AbsoluteFill>
      <SceneFade />
    </AbsoluteFill>
  );
};
