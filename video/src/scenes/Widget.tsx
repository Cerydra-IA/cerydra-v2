import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";
import { SceneFade } from "./SceneFade";

// Typewriter: shows `text` progressively, fully shown when progress >= 1
const TypeField: React.FC<{ label: string; value: string; progress: number; placeholder?: string }> = ({
  label, value, progress, placeholder = "",
}) => {
  const charCount = Math.round(progress * value.length);
  const displayed = value.slice(0, charCount);
  const filled = progress > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: "#374151" }}>
        {label} <span style={{ color: "#6366F1" }}>*</span>
      </label>
      <div style={{
        border: filled ? "1.5px solid #1a1a2e" : "1.5px solid #D1D5DB",
        borderRadius: 8,
        padding: "8px 12px",
        backgroundColor: filled ? "#F9FAFB" : "#fff",
        minHeight: 36,
        position: "relative",
      }}>
        <span style={{
          fontFamily: fonts.body, fontSize: 13,
          color: filled ? "#111827" : "#9CA3AF",
        }}>
          {filled ? displayed : placeholder}
          {filled && charCount < value.length && (
            <span style={{ borderRight: "2px solid #1a1a2e", marginLeft: 1 }}>&nbsp;</span>
          )}
        </span>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ text: string; delay: number; frame: number }> = ({ text, delay, frame }) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(frame, [delay, delay + 20], [-20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity, transform: `translateX(${x}px)` }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "#10B98118", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontFamily: fonts.body, fontSize: 20, fontWeight: 500, color: colors.navy, opacity: 0.8 }}>{text}</span>
    </div>
  );
};

export const Widget: React.FC = () => {
  const frame = useCurrentFrame();

  const leftOpacity = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const leftY = interpolate(frame, [0, 22], [24, 0], { extrapolateRight: "clamp" });

  const widgetOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const widgetX = interpolate(frame, [10, 45], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Field fill timings
  const prenomP  = interpolate(frame, [60, 95],  [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nomP     = interpolate(frame, [80, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const emailP   = interpolate(frame, [105, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const telP     = interpolate(frame, [125, 158], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dateP    = interpolate(frame, [148, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const persP    = interpolate(frame, [165, 185], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const heureP   = interpolate(frame, [180, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Button glow when all filled
  const btnGlow  = interpolate(frame, [205, 230], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowPulse = interpolate(frame % 45, [0, 22, 45], [0.5, 1, 0.5], { extrapolateRight: "clamp" });

  // Confirmation badge
  const badgeOpacity = interpolate(frame, [240, 270], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeY = interpolate(frame, [240, 270], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FAFC", overflow: "hidden" }}>
      <style>{fontStyle}</style>

      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 700px 500px at 68% 50%, ${colors.accent}07, transparent)` }} />

      {/* Left panel */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "44%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        paddingLeft: 90, paddingRight: 50,
        opacity: leftOpacity, transform: `translateY(${leftY}px)`,
      }}>
        <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14, display: "block" }}>
          Widget intégrable
        </span>
        <h2 style={{ fontFamily: fonts.heading, fontSize: 52, fontWeight: 800, color: colors.navy, lineHeight: 1.1, margin: "0 0 28px" }}>
          Réservez en quelques secondes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          <CheckItem text="Sur votre site existant" delay={35} frame={frame} />
          <CheckItem text="Créneaux automatiques" delay={50} frame={frame} />
          <CheckItem text="Confirmation immédiate" delay={65} frame={frame} />
          <CheckItem text="Zéro commission" delay={80} frame={frame} />
        </div>

        {/* Confirmation badge */}
        <div style={{
          opacity: badgeOpacity, transform: `translateY(${badgeY}px)`,
          display: "inline-flex", alignItems: "center", gap: 12,
          backgroundColor: colors.navy, borderRadius: 14, padding: "14px 22px", alignSelf: "flex-start",
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: colors.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 800, color: colors.white }}>IA</span>
          </div>
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: colors.white }}>Idriss Ali</div>
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.white, opacity: 0.55 }}>Ven. 26 juin · 20h30 · 2 pers.</div>
          </div>
          <div style={{
            marginLeft: 6, backgroundColor: "#10B981", borderRadius: 8, padding: "4px 12px",
            boxShadow: `0 0 ${12 * glowPulse * badgeOpacity}px #10B98155`,
          }}>
            <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: "#fff" }}>Confirmé ✓</span>
          </div>
        </div>
      </div>

      {/* Right panel — coded widget */}
      <div style={{
        position: "absolute", right: 80, top: "50%",
        transform: `translateY(-50%) translateX(${widgetX}px)`,
        opacity: widgetOpacity, width: 440,
      }}>
        {/* Widget card */}
        <div style={{
          backgroundColor: "#fff", borderRadius: 24,
          boxShadow: "0 32px 64px rgba(15,30,69,0.16), 0 4px 16px rgba(15,30,69,0.08)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: "#111827" }}>Réserver une table</div>
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: "#6B7280", marginTop: 2 }}>Le Comptoir</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#6B7280" }}>×</span>
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Prénom + Nom */}
            <div style={{ display: "flex", gap: 10 }}>
              <TypeField label="Prénom" value="Idriss" progress={prenomP} placeholder="Jean" />
              <TypeField label="Nom" value="Ali" progress={nomP} placeholder="Dupont" />
            </div>
            {/* Email + Téléphone */}
            <div style={{ display: "flex", gap: 10 }}>
              <TypeField label="Email" value="idrissproali@gmail.com" progress={emailP} placeholder="jean@exemple.fr" />
              <TypeField label="Téléphone" value="06 12 34 56 78" progress={telP} placeholder="06 12 34 56 78" />
            </div>
            {/* Date + Personnes */}
            <div style={{ display: "flex", gap: 10 }}>
              <TypeField label="Date" value="26/06/2026" progress={dateP} placeholder="jj/mm/aaaa" />
              <TypeField label="Personnes" value="2 personnes" progress={persP} placeholder="2 personnes" />
            </div>
            {/* Heure */}
            <TypeField label="Heure" value="20:30" progress={heureP} placeholder="Choisissez une date" />

            {/* Button */}
            <div style={{
              marginTop: 8,
              backgroundColor: btnGlow > 0.5 ? "#1a1a2e" : "#374151",
              borderRadius: 12, padding: "14px",
              textAlign: "center",
              boxShadow: btnGlow > 0 ? `0 0 ${20 * glowPulse * btnGlow}px rgba(26,26,46,0.4)` : "none",
              transition: "none",
            }}>
              <span style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {btnGlow > 0.9 ? "✓ Réservation confirmée !" : "Confirmer la réservation"}
              </span>
            </div>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: "#9CA3AF" }}>Propulsé par <strong style={{ color: "#1a1a2e" }}>CERYDRA</strong></span>
            </div>
          </div>
        </div>

        {/* Shadow underneath */}
        <div style={{ position: "absolute", bottom: -16, left: "15%", right: "15%", height: 32, background: "rgba(15,30,69,0.10)", filter: "blur(16px)", borderRadius: "50%" }} />
      </div>
      <SceneFade />
    </AbsoluteFill>
  );
};
