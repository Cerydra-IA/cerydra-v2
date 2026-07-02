import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";
import { SceneFade } from "./SceneFade";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 20, stiffness: 80 }, from: 0.6, to: 1 });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const taglineY = interpolate(frame, [25, 55], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [25, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ringScale = interpolate(frame % 60, [0, 30, 60], [1, 1.06, 1], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 40], [0, 0.3], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy, overflow: "hidden" }}>
      <style>{fontStyle}</style>

      {/* Rings */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", border: `2px solid ${colors.accent}`, opacity: ringOpacity * 0.4, transform: `scale(${ringScale * 1.3})` }} />
        <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", border: `2px solid ${colors.accent}`, opacity: ringOpacity * 0.7, transform: `scale(${ringScale})` }} />
      </AbsoluteFill>

      {/* Content */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        {/* Logo image + text */}
        <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <Img
            src={staticFile("screenshots/logo.png")}
            style={{ width: 110, height: 110, objectFit: "contain" }}
          />
          <span style={{ fontFamily: fonts.heading, fontSize: 108, fontWeight: 800, color: colors.white, letterSpacing: "0.06em", lineHeight: 1 }}>
            CERYDRA
          </span>
          <div style={{ width: 70, height: 4, backgroundColor: colors.accent, borderRadius: 2 }} />
        </div>

        {/* Tagline */}
        <div style={{ transform: `translateY(${taglineY}px)`, opacity: taglineOpacity, textAlign: "center" }}>
          <span style={{ fontFamily: fonts.body, fontSize: 30, fontWeight: 500, color: colors.white, opacity: 0.85, letterSpacing: "0.02em" }}>
            Ne ratez plus jamais une réservation
          </span>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subtitleOpacity }}>
          <span style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 400, color: colors.accent, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Plateforme SaaS · Restauration
          </span>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180, background: `linear-gradient(to top, ${colors.accent}18, transparent)` }} />
      <SceneFade />
    </AbsoluteFill>
  );
};
