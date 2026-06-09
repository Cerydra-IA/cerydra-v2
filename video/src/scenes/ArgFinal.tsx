import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

// Floating particle
const Particle: React.FC<{
  frame: number;
  startX: number;
  delay: number;
  size: number;
  speed: number;
}> = ({ frame, startX, delay, size, speed }) => {
  const f = Math.max(0, frame - delay);
  const y = interpolate(f, [0, 300], [1100, -100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(f, [0, 20, 250, 300], [0, 0.6, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = startX + Math.sin(f * speed) * 30;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: colors.accent,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

const PARTICLES = [
  { startX: 200, delay: 0, size: 6, speed: 0.04 },
  { startX: 500, delay: 15, size: 4, speed: 0.03 },
  { startX: 800, delay: 5, size: 8, speed: 0.05 },
  { startX: 1100, delay: 25, size: 5, speed: 0.035 },
  { startX: 1400, delay: 10, size: 7, speed: 0.045 },
  { startX: 1650, delay: 20, size: 4, speed: 0.025 },
  { startX: 350, delay: 30, size: 6, speed: 0.04 },
  { startX: 950, delay: 8, size: 5, speed: 0.06 },
  { startX: 1250, delay: 18, size: 4, speed: 0.03 },
  { startX: 1750, delay: 12, size: 7, speed: 0.05 },
  { startX: 650, delay: 22, size: 3, speed: 0.04 },
  { startX: 1550, delay: 35, size: 5, speed: 0.03 },
];

export const ArgFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line 1: "Zéro commission." spring in
  const line1Scale = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80 },
    from: 0.7,
    to: 1,
  });
  const line1Opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Line 2: "Vos clients vous appartiennent." slides up
  const line2Y = interpolate(frame, [50, 90], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Opacity = interpolate(frame, [50, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line 3: "cerydra.fr" fades in with glow pulse
  const line3Opacity = interpolate(frame, [100, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse
  const glowOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.4, 0.9, 0.4],
    { extrapolateRight: "clamp" }
  );

  // Divider line
  const dividerWidth = interpolate(frame, [30, 70], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline below cerydra.fr
  const taglineOpacity = interpolate(frame, [140, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{fontStyle}</style>

      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 900px 500px at 50% 50%, ${colors.accent}15, transparent 70%)`,
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} frame={frame} {...p} />
      ))}

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Line 1 */}
        <div
          style={{
            transform: `scale(${line1Scale})`,
            opacity: line1Opacity,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 110,
              fontWeight: 800,
              color: colors.white,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              display: "block",
              textAlign: "center",
            }}
          >
            Zéro commission.
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: dividerWidth,
            height: 3,
            backgroundColor: colors.accent,
            borderRadius: 2,
            marginBottom: 28,
          }}
        />

        {/* Line 2 */}
        <div
          style={{
            transform: `translateY(${line2Y}px)`,
            opacity: line2Opacity,
            marginBottom: 48,
          }}
        >
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 54,
              fontWeight: 700,
              color: colors.white,
              opacity: 0.85,
              letterSpacing: "0.01em",
              display: "block",
              textAlign: "center",
            }}
          >
            Vos clients vous appartiennent.
          </span>
        </div>

        {/* Line 3: cerydra.fr */}
        <div
          style={{
            opacity: line3Opacity,
            position: "relative",
            display: "inline-block",
          }}
        >
          {/* Glow behind text */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              background: `radial-gradient(ellipse 300px 80px at 50% 50%, ${colors.accent}${Math.round(glowOpacity * 99).toString(16).padStart(2, "0")}, transparent)`,
              filter: "blur(16px)",
            }}
          />
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 68,
              fontWeight: 700,
              color: colors.accent,
              letterSpacing: "0.04em",
              position: "relative",
            }}
          >
            cerydra.fr
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            marginTop: 32,
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 22,
              fontWeight: 400,
              color: colors.white,
              opacity: 0.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Plateforme SaaS — Réservation restaurant
          </span>
        </div>
      </AbsoluteFill>

      {/* Bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 180,
          background: `linear-gradient(to top, ${colors.accent}10, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
