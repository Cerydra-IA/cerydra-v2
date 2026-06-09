import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

export const Rappel24h: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Email card slides in
  const cardY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
    from: 120,
    to: 0,
  });
  const cardOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Clock icon animates in
  const clockScale = spring({
    frame: Math.max(0, frame - 35),
    fps,
    config: { damping: 14, stiffness: 180 },
    from: 0,
    to: 1,
  });
  const clockOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Clock hand rotation
  const clockRotation = interpolate(frame, [50, 200], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Content staggered fades
  const row1Opacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const row2Opacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const row3Opacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cancelOpacity = interpolate(frame, [90, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom overlay
  const overlayOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "24h" badge pops in
  const badgeScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 12, stiffness: 220 },
    from: 0,
    to: 1,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F0F4FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{fontStyle}</style>

      {/* Subtle background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #F0F4FF 0%, #EEF2FF 100%)",
        }}
      />

      {/* Email card */}
      <div
        style={{
          transform: `translateY(${cardY}px)`,
          opacity: cardOpacity,
          width: 640,
          backgroundColor: colors.white,
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(15, 30, 69, 0.12), 0 4px 16px rgba(15, 30, 69, 0.06)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            backgroundColor: "#F1F5F9",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          {["#FC5F57", "#FDBC2C", "#29CA41"].map((c, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: c,
              }}
            />
          ))}
          <div
            style={{
              flex: 1,
              marginLeft: 12,
              backgroundColor: colors.white,
              borderRadius: 6,
              padding: "6px 14px",
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.navy,
              opacity: 0.5,
            }}
          >
            Rappel réservation — CERYDRA
          </div>
        </div>

        {/* Email header */}
        <div
          style={{
            backgroundColor: "#1E3A6E",
            padding: "28px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
                color: "#60A5FA",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              CERYDRA
            </span>
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 20,
                  fontWeight: 700,
                  color: colors.white,
                }}
              >
                Rappel : votre réservation demain à 20h00
              </span>
            </div>
          </div>

          {/* Clock icon with 24h badge */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                transform: `scale(${clockScale})`,
                opacity: clockOpacity,
                backgroundColor: "#2D5299",
                borderRadius: "50%",
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <line x1="12" y1="12" x2="12" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line
                  x1="12"
                  y1="12"
                  x2="16"
                  y2="12"
                  stroke="#60A5FA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ transform: `rotate(${clockRotation}deg)`, transformOrigin: "12px 12px" }}
                />
              </svg>
            </div>
            {/* 24h badge */}
            <div
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                transform: `scale(${badgeScale})`,
                backgroundColor: colors.accent,
                borderRadius: 20,
                padding: "3px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.white,
                }}
              >
                24h
              </span>
            </div>
          </div>
        </div>

        {/* Email body */}
        <div style={{ padding: "32px 36px 36px" }}>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.navy,
              opacity: 0.7,
              margin: "0 0 28px 0",
            }}
          >
            Bonjour Marie, nous vous rappelons votre réservation de demain :
          </p>

          {/* Info rows */}
          {[
            { label: "Date", value: "Demain — 15 juin 2026", opacity: row1Opacity },
            { label: "Heure", value: "20h00", opacity: row2Opacity },
            { label: "Lieu", value: "Le Cèdre Bleu, Paris 6e", opacity: row3Opacity },
          ].map(({ label, value, opacity }) => (
            <div
              key={label}
              style={{
                opacity,
                display: "flex",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.navy,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  width: 120,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 17,
                  fontWeight: 600,
                  color: colors.navy,
                }}
              >
                {value}
              </span>
            </div>
          ))}

          {/* Cancel link button */}
          <div
            style={{
              marginTop: 28,
              opacity: cancelOpacity,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                backgroundColor: colors.navy,
                borderRadius: 10,
                padding: "14px 24px",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.white,
                }}
              >
                Confirmer ma présence
              </span>
            </div>
            <div
              style={{
                borderRadius: 10,
                padding: "14px 24px",
                border: "2px solid #E2E8F0",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  fontWeight: 600,
                  color: colors.navy,
                  opacity: 0.5,
                }}
              >
                Annuler
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: overlayOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: colors.navy,
            borderRadius: 12,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={colors.accent} strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 17,
              fontWeight: 600,
              color: colors.white,
            }}
          >
            Rappel automatique 24h avant — zéro oubli
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
