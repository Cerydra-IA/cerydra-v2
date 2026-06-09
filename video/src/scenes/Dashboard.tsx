import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontStyle, fonts } from "../utils/fonts";

const reservations = [
  { name: "Marie Dupont", date: "15 juin 2026", time: "20h00", covers: 2 },
  { name: "Jean Martin", date: "15 juin 2026", time: "19h30", covers: 4 },
  { name: "Sophie Leclerc", date: "16 juin 2026", time: "20h30", covers: 3 },
  { name: "Pierre Bernard", date: "17 juin 2026", time: "21h00", covers: 6 },
];

const NAV_ICONS = [
  // Dashboard icon
  <svg key="dash" width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
  </svg>,
  // Calendar icon
  <svg key="cal" width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
    <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
    <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
  </svg>,
  // Users icon
  <svg key="users" width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
    <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
  </svg>,
  // Settings icon
  <svg key="settings" width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
  </svg>,
];

// Simple bar chart SVG with animated bars
const BarChart: React.FC<{ progress: number }> = ({ progress }) => {
  const bars = [65, 80, 45, 90, 70, 85, 60, 95, 75, 88, 72, 91];
  return (
    <svg width="100%" height="120" viewBox="0 0 360 120" preserveAspectRatio="none">
      {bars.map((h, i) => {
        const animH = h * progress;
        return (
          <rect
            key={i}
            x={i * 30 + 5}
            y={120 - animH * 1.1}
            width="20"
            height={animH * 1.1}
            rx="4"
            fill={colors.accent}
            opacity={0.7 + (i % 3) * 0.1}
          />
        );
      })}
    </svg>
  );
};

// Line chart SVG with animated stroke-dashoffset
const LineChart: React.FC<{ progress: number }> = ({ progress }) => {
  const points = "0,80 30,65 60,70 90,45 120,55 150,35 180,42 210,28 240,38 270,20 300,30 330,15 360,22";
  const totalLength = 520; // approximate path length
  const dashOffset = totalLength * (1 - progress);

  return (
    <svg width="100%" height="120" viewBox="0 0 360 120" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,80 ${points} 360,120 0,120`}
        fill={colors.accent}
        opacity={0.08 * progress}
      />
      <polyline
        points={points}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={totalLength}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade in
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Reservation rows staggered slide in
  const rowAnimations = reservations.map((_, i) => {
    const start = 40 + i * 20;
    return {
      x: interpolate(frame, [start, start + 30], [60, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      opacity: interpolate(frame, [start, start + 30], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    };
  });

  // Stats cards
  const statsOpacity = interpolate(frame, [130, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Charts animate
  const chartProgress = interpolate(frame, [180, 340], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sidebar slide in
  const sidebarX = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 90 },
    from: -100,
    to: 0,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.lightGray, overflow: "hidden" }}>
      <style>{fontStyle}</style>

      {/* Sidebar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 80,
          backgroundColor: colors.navy,
          transform: `translateX(${sidebarX - 100}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 32,
          gap: 32,
          zIndex: 10,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: colors.accent,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 18,
              fontWeight: 800,
              color: colors.white,
            }}
          >
            C
          </span>
        </div>

        {/* Nav icons */}
        {NAV_ICONS.map((icon, i) => (
          <div
            key={i}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: i === 0 ? `${colors.accent}33` : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: i === 0 ? `1px solid ${colors.accent}55` : "none",
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 80,
          right: 0,
          padding: "40px 48px",
          overflowY: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: titleOpacity,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.navy,
                opacity: 0.4,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 4,
              }}
            >
              Bienvenue
            </span>
            <span
              style={{
                fontFamily: fonts.heading,
                fontSize: 36,
                fontWeight: 700,
                color: colors.navy,
              }}
            >
              Tableau de bord
            </span>
          </div>
          <div
            style={{
              backgroundColor: colors.navy,
              borderRadius: 12,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#10B981",
              }}
            />
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: colors.white,
              }}
            >
              En ligne
            </span>
          </div>
        </div>

        {/* Stats cards */}
        <div
          style={{
            opacity: statsOpacity,
            display: "flex",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {[
            { label: "Réservations ce mois", value: "12", icon: "📅" },
            { label: "Couverts", value: "89", icon: "🍽️" },
            { label: "Annulations", value: "5%", icon: "📊" },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 4px 16px rgba(15, 30, 69, 0.06)",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.navy,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 40,
                  fontWeight: 700,
                  color: colors.navy,
                  display: "block",
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Two column layout: table + charts */}
        <div style={{ display: "flex", gap: 24, height: 460 }}>
          {/* Reservation list */}
          <div
            style={{
              flex: "0 0 55%",
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: "24px",
              boxShadow: "0 4px 16px rgba(15, 30, 69, 0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.navy,
                }}
              >
                Réservations récentes
              </span>
            </div>

            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto auto auto",
                gap: 12,
                padding: "0 0 12px 0",
                borderBottom: "2px solid #F1F5F9",
                marginBottom: 8,
                opacity: titleOpacity,
              }}
            >
              {["Nom", "Date", "Heure", "Couverts", "Statut"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.navy,
                    opacity: 0.4,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Reservation rows */}
            {reservations.map((r, i) => {
              const anim = rowAnimations[i];
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto auto auto",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom: i < reservations.length - 1 ? "1px solid #F8FAFC" : "none",
                    transform: `translateX(${anim.x}px)`,
                    opacity: anim.opacity,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 15,
                      fontWeight: 600,
                      color: colors.navy,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.navy,
                      opacity: 0.6,
                    }}
                  >
                    {r.date}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.navy,
                    }}
                  >
                    {r.time}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.navy,
                      textAlign: "center",
                    }}
                  >
                    {r.covers}
                  </span>
                  <div
                    style={{
                      backgroundColor: "#D1FAE5",
                      borderRadius: 20,
                      padding: "4px 12px",
                      display: "inline-block",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#059669",
                        whiteSpace: "nowrap",
                      }}
                    >
                      confirmée
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts column */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Bar chart */}
            <div
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: "20px 20px 12px",
                boxShadow: "0 4px 16px rgba(15, 30, 69, 0.06)",
                opacity: statsOpacity,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.navy,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                Réservations / semaine
              </span>
              <BarChart progress={chartProgress} />
            </div>

            {/* Line chart */}
            <div
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: "20px 20px 12px",
                boxShadow: "0 4px 16px rgba(15, 30, 69, 0.06)",
                opacity: statsOpacity,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.navy,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                Couverts / mois
              </span>
              <LineChart progress={chartProgress} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
