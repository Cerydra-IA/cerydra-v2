import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scale spring
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
    from: 0.5,
    to: 1,
  });

  // Logo opacity fade in
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline slides up with delay
  const taglineY = interpolate(frame, [30, 60], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated ring pulse
  const ringScale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.08, 1],
    { extrapolateRight: "clamp" }
  );
  const ringOpacity = interpolate(frame, [0, 30], [0, 0.25], {
    extrapolateRight: "clamp",
  });

  // Subtitle fade in even later
  const subtitleOpacity = interpolate(frame, [70, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy, overflow: "hidden" }}>
      <style>{fontStyle}</style>

      {/* Decorative rings behind logo */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: `2px solid ${colors.accent}`,
            opacity: ringOpacity * 0.4,
            transform: `scale(${ringScale * 1.3})`,
          }}
        />
        {/* Middle ring */}
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            border: `2px solid ${colors.accent}`,
            opacity: ringOpacity * 0.6,
            transform: `scale(${ringScale})`,
          }}
        />
        {/* Inner filled circle */}
        <div
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            backgroundColor: colors.accent,
            opacity: ringOpacity * 0.12,
          }}
        />
      </AbsoluteFill>

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 120,
              fontWeight: 800,
              color: colors.white,
              letterSpacing: "0.08em",
              lineHeight: 1,
            }}
          >
            CERYDRA
          </span>
          <div
            style={{
              width: 80,
              height: 4,
              backgroundColor: colors.accent,
              borderRadius: 2,
              marginTop: 16,
            }}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            transform: `translateY(${taglineY}px)`,
            opacity: taglineOpacity,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 32,
              fontWeight: 500,
              color: colors.white,
              opacity: 0.85,
              letterSpacing: "0.02em",
            }}
          >
            Ne ratez plus jamais une réservation
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 20,
              fontWeight: 400,
              color: colors.accent,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Plateforme SaaS de réservation restaurant
          </span>
        </div>
      </AbsoluteFill>

      {/* Bottom gradient decoration */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(to top, ${colors.accent}22, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
