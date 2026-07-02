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

export const ArgFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Opacity = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(frame, [30, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const line2Opacity = interpolate(frame, [55, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Y = interpolate(frame, [55, 80], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const urlOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlScale = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 20, stiffness: 100 }, from: 0.8, to: 1 });

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.4, 1, 0.4], { extrapolateRight: "clamp" });

  const dividerW = interpolate(frame, [25, 65], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{fontStyle}</style>

      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 1000px 600px at 50% 50%, ${colors.accent}14, transparent 70%)` }} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        {/* Divider */}
        <div style={{ width: dividerW, height: 3, backgroundColor: colors.accent, borderRadius: 2, marginBottom: 32 }} />

        {/* Line 1 */}
        <div style={{ opacity: line1Opacity, transform: `translateY(${line1Y}px)`, marginBottom: 8 }}>
          <span style={{ fontFamily: fonts.heading, fontSize: 90, fontWeight: 800, color: colors.white, letterSpacing: "-0.02em", lineHeight: 1.05, display: "block", textAlign: "center" }}>
            Zéro commission.
          </span>
        </div>

        {/* Line 2 */}
        <div style={{ opacity: line2Opacity, transform: `translateY(${line2Y}px)`, marginBottom: 48 }}>
          <span style={{ fontFamily: fonts.heading, fontSize: 48, fontWeight: 700, color: colors.white, opacity: 0.8, letterSpacing: "0.01em", display: "block", textAlign: "center" }}>
            Vos clients vous appartiennent.
          </span>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOpacity, transform: `scale(${urlScale})`, position: "relative" }}>
          <div style={{
            position: "absolute", inset: -20,
            background: `radial-gradient(ellipse 320px 80px at 50% 50%, ${colors.accent}${Math.round(glowPulse * 60).toString(16).padStart(2, "0")}, transparent)`,
            filter: "blur(16px)",
          }} />
          <span style={{ fontFamily: fonts.heading, fontSize: 72, fontWeight: 700, color: colors.accent, letterSpacing: "0.04em", position: "relative" }}>
            cerydra.fr
          </span>
        </div>

        {/* Tagline */}
        <div style={{ opacity: interpolate(frame, [140, 170], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 28 }}>
          <span style={{ fontFamily: fonts.body, fontSize: 20, fontWeight: 400, color: colors.white, opacity: 0.45, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Plateforme SaaS · Réservation restaurant
          </span>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: `linear-gradient(to top, ${colors.accent}10, transparent)` }} />
      <SceneFade />
    </AbsoluteFill>
  );
};
