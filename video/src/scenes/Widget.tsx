import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

// Helper: simulate typing by returning a substring based on frame
const typeText = (text: string, frame: number, startFrame: number, duration: number): string => {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return text.slice(0, Math.floor(progress * text.length));
};

export const Widget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card slides in
  const cardY = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 90 },
    from: 80,
    to: 0,
  });
  const cardOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Field animations
  const nameText = typeText("Marie Dupont", frame, 30, 40);
  const emailText = typeText("marie@example.com", frame, 90, 50);

  const dateOpacity = interpolate(frame, [155, 175], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const personnesOpacity = interpolate(frame, [185, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Button pulse
  const buttonScale = interpolate(
    frame,
    [220, 235, 250, 265],
    [1, 1.06, 1, 1.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Button click
  const buttonClickScale = spring({
    frame: Math.max(0, frame - 270),
    fps,
    config: { damping: 15, stiffness: 200 },
    from: 1,
    to: 0.92,
  });
  const postClickScale = frame > 290 ? 1 : buttonClickScale;

  // Confirmation appears
  const confirmOpacity = interpolate(frame, [310, 340], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const confirmScale = spring({
    frame: Math.max(0, frame - 310),
    fps,
    config: { damping: 18, stiffness: 80 },
    from: 0.8,
    to: 1,
  });

  const showConfirmation = frame >= 310;

  // Label fade in
  const labelOpacity = interpolate(frame, [20, 50], [0, 1], {
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

      {/* Background subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${colors.accent}18 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.5,
        }}
      />

      {/* Widget card */}
      <div
        style={{
          transform: `translateY(${cardY}px)`,
          opacity: cardOpacity,
          width: 560,
          backgroundColor: colors.white,
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(15, 30, 69, 0.14), 0 4px 16px rgba(15, 30, 69, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          style={{
            backgroundColor: colors.navy,
            padding: "28px 36px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: colors.accent,
            }}
          />
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 26,
              fontWeight: 700,
              color: colors.white,
              letterSpacing: "0.01em",
            }}
          >
            Réserver une table
          </span>
        </div>

        {/* Card body */}
        <div style={{ padding: "36px 36px 40px" }}>
          {!showConfirmation ? (
            <>
              {/* Name field */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.navy,
                    opacity: 0.6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Nom complet
                </label>
                <div
                  style={{
                    border: `2px solid ${frame >= 30 ? colors.accent : "#E2E8F0"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minHeight: 52,
                    transition: "border-color 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 18,
                      color: colors.navy,
                    }}
                  >
                    {nameText}
                  </span>
                  {frame >= 30 && frame <= 70 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 20,
                        backgroundColor: colors.accent,
                        opacity: Math.round(frame / 15) % 2 === 0 ? 1 : 0,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Email field */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.navy,
                    opacity: 0.6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Email
                </label>
                <div
                  style={{
                    border: `2px solid ${frame >= 90 && frame <= 150 ? colors.accent : "#E2E8F0"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minHeight: 52,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 18,
                      color: colors.navy,
                    }}
                  >
                    {emailText}
                  </span>
                  {frame >= 90 && frame <= 140 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 20,
                        backgroundColor: colors.accent,
                        opacity: Math.round(frame / 15) % 2 === 0 ? 1 : 0,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Date field */}
              <div
                style={{
                  marginBottom: 20,
                  opacity: dateOpacity,
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.navy,
                    opacity: 0.6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Date
                </label>
                <div
                  style={{
                    border: "2px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "14px 16px",
                    minHeight: 52,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 18,
                      color: colors.navy,
                    }}
                  >
                    15 juin 2026
                  </span>
                </div>
              </div>

              {/* Personnes selector */}
              <div
                style={{
                  marginBottom: 32,
                  opacity: personnesOpacity,
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.navy,
                    opacity: 0.6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Nombre de personnes
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        border: `2px solid ${n === 2 ? colors.accent : "#E2E8F0"}`,
                        backgroundColor: n === 2 ? `${colors.accent}15` : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.body,
                        fontSize: 18,
                        fontWeight: n === 2 ? 700 : 400,
                        color: n === 2 ? colors.accent : colors.navy,
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reserve button */}
              <div
                style={{
                  opacity: personnesOpacity,
                  transform: `scale(${frame >= 270 ? postClickScale : buttonScale})`,
                }}
              >
                <div
                  style={{
                    backgroundColor: colors.navy,
                    borderRadius: 12,
                    padding: "18px 0",
                    textAlign: "center",
                    cursor: "pointer",
                    boxShadow: `0 8px 24px ${colors.navy}44`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 20,
                      fontWeight: 700,
                      color: colors.white,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Réserver
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Confirmation state */
            <div
              style={{
                opacity: confirmOpacity,
                transform: `scale(${confirmScale})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                gap: 20,
              }}
            >
              {/* Check circle */}
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  backgroundColor: "#D1FAE5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <path
                    d="M9 22L18 31L35 13"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.navy,
                }}
              >
                Réservation confirmée !
              </span>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 16,
                  color: colors.navy,
                  opacity: 0.6,
                  textAlign: "center",
                }}
              >
                Un email de confirmation a été envoyé à{"\n"}marie@example.com
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Corner label */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 80,
          opacity: labelOpacity,
          backgroundColor: colors.navy,
          borderRadius: 10,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: colors.accent,
          }}
        />
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 16,
            fontWeight: 600,
            color: colors.white,
          }}
        >
          Widget intégrable sur votre site
        </span>
      </div>
    </AbsoluteFill>
  );
};
