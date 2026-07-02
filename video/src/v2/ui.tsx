import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../utils/fonts";

// ─── Cadre iPhone ───────────────────────────────────────────────────
export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
}> = ({ children, width = 390, style }) => {
  const h = width * (844 / 390);
  const r = width * 0.14;
  return (
    <div
      style={{
        width: width + 24,
        height: h + 24,
        background: "#0b0b0f",
        borderRadius: r + 12,
        padding: 12,
        boxShadow: "0 40px 90px rgba(0,0,0,.45), inset 0 0 0 2px #2a2a32",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          width,
          height: h,
          borderRadius: r,
          overflow: "hidden",
          position: "relative",
          background: "#000",
        }}
      >
        {children}
        {/* encoche dynamic island */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.3,
            height: 26,
            background: "#000",
            borderRadius: 20,
            zIndex: 50,
          }}
        />
      </div>
    </div>
  );
};

// ─── Notification iOS ───────────────────────────────────────────────
export const IOSNotification: React.FC<{
  appear?: number; // frame d'apparition
  title?: string;
  body?: string;
  width?: number;
}> = ({
  appear = 0,
  title = "Cerydra — Nouvelle réservation 🍽️",
  body = "Sophie Martin — sam. 4 juil. à 20:00 · 2 pers.",
  width = 640,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - appear);
  const y = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 }, from: -160, to: 0 });
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width,
        transform: `translateY(${y}px)`,
        opacity,
        background: "rgba(250,250,252,.92)",
        backdropFilter: "blur(20px)",
        borderRadius: 24,
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        boxShadow: "0 18px 50px rgba(0,0,0,.35)",
        fontFamily: fonts.body,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: colors.navy,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontFamily: fonts.heading,
          fontSize: 24,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        C
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</div>
        <div style={{ fontSize: 16, color: "#333", marginTop: 2 }}>{body}</div>
      </div>
      <div style={{ fontSize: 13, color: "#8a8a8e", alignSelf: "flex-start" }}>maintenant</div>
    </div>
  );
};

// ─── Avatar minimaliste ─────────────────────────────────────────────
export const Avatar: React.FC<{
  name: string;
  hue: string;
  size?: number;
}> = ({ name, hue, size = 72 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: hue,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.heading,
        fontWeight: 800,
        fontSize: size * 0.42,
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      }}
    >
      {name[0]}
    </div>
    <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: size * 0.36, color: "#fff" }}>
      {name}
    </span>
  </div>
);

// ─── Punchline animée ───────────────────────────────────────────────
export const Punch: React.FC<{
  text: string;
  appear?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, appear = 0, size = 64, color = "#fff", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - appear);
  const y = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 }, from: 46, to: 0 });
  const opacity = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: fonts.heading,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.12,
        color,
        transform: `translateY(${y}px)`,
        opacity,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// ─── Sous-texte ─────────────────────────────────────────────────────
export const Sub: React.FC<{
  text: string;
  appear?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, appear = 0, size = 30, color = "rgba(255,255,255,.75)", style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [appear, appear + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        fontFamily: fonts.body,
        fontWeight: 500,
        fontSize: size,
        color,
        opacity,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// ─── Fondu entrée/sortie de scène ───────────────────────────────────
export const Fade: React.FC<{
  children: React.ReactNode;
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
}> = ({ children, duration, fadeIn = 10, fadeOut = 10 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, fadeIn, duration - fadeOut, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <div style={{ position: "absolute", inset: 0, opacity }}>{children}</div>;
};

// ─── Téléphone qui sonne (côté Sophie) ─────────────────────────────
export const CallingScreen: React.FC<{ answered?: boolean }> = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.05 * Math.sin(frame / 4);
  const secs = Math.floor(frame / 30);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg,#1c1c22 0%,#0d0d12 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 110,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ color: "rgba(255,255,255,.6)", fontSize: 17 }}>appel en cours…</div>
      <div style={{ color: "#fff", fontFamily: fonts.heading, fontSize: 34, fontWeight: 700, marginTop: 8 }}>
        Le Comptoir
      </div>
      <div style={{ color: "rgba(255,255,255,.45)", fontSize: 16, marginTop: 6 }}>
        00:{String(secs).padStart(2, "0")}
      </div>
      <div
        style={{
          marginTop: 64,
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: "#2a2a33",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pulse})`,
          fontSize: 52,
        }}
      >
        📞
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          marginBottom: 70,
          width: 78,
          height: 78,
          borderRadius: "50%",
          background: "#e63946",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
        }}
      >
        <span style={{ transform: "rotate(135deg)" }}>📞</span>
      </div>
    </div>
  );
};
