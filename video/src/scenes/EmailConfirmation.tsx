import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

export const EmailConfirmation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Email card slides in from bottom
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

  // Bell bounce
  const bellY = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 10, stiffness: 200 },
    from: -40,
    to: 0,
  });
  const bellOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bell secondary bounce
  const bellBounce = interpolate(
    frame,
    [60, 70, 80, 90, 100],
    [0, -8, 0, -4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Content rows fade in staggered
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
  const row4Opacity = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom overlay text
  const overlayOpacity = interpolate(frame, [110, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.lightGray,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{fontStyle}</style>

      {/* Subtle background pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${colors.lightGray} 0%, #EEF2FF 100%)`,
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
        {/* Email top bar (browser/client chrome) */}
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
            Nouvelle réservation — CERYDRA
          </div>
        </div>

        {/* Email header stripe */}
        <div
          style={{
            backgroundColor: colors.navy,
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
                color: colors.accent,
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
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.white,
                }}
              >
                Votre réservation est confirmée ✓
              </span>
            </div>
          </div>

          {/* Bell icon */}
          <div
            style={{
              transform: `translateY(${bellY + bellBounce}px)`,
              opacity: bellOpacity,
              backgroundColor: colors.accent,
              borderRadius: "50%",
              width: 52,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
              marginBottom: 28,
              margin: "0 0 28px 0",
            }}
          >
            Bonjour Marie, voici le récapitulatif de votre réservation :
          </p>

          {/* Info rows */}
          {[
            { label: "Nom", value: "Marie Dupont", opacity: row1Opacity },
            { label: "Date", value: "15 juin 2026 à 20h00", opacity: row2Opacity },
            { label: "Restaurant", value: "Le Cèdre Bleu", opacity: row3Opacity },
            { label: "Couverts", value: "2 personnes", opacity: row4Opacity },
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

          {/* CTA button */}
          <div
            style={{
              marginTop: 28,
              opacity: row4Opacity,
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-block",
                backgroundColor: colors.accent,
                borderRadius: 10,
                padding: "14px 32px",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.white,
                }}
              >
                Voir ma réservation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom overlay text */}
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
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              stroke={colors.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 17,
              fontWeight: 600,
              color: colors.white,
            }}
          >
            Email automatique envoyé instantanément
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
