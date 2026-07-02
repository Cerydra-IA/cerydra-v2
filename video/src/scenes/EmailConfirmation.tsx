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


export const Ping: React.FC<{ frame: number; startFrame?: number; color?: string }> = ({
  frame, startFrame = 0, color = "#10B981",
}) => {
  const f = Math.max(0, frame - startFrame);
  return (
    <div style={{ position: "relative", width: 64, height: 64 }}>
      {[0, 18, 36].map((delay) => {
        const lf = Math.max(0, f - delay);
        const scale = interpolate(lf, [0, 50], [0.3, 2.2], { extrapolateRight: "clamp" });
        const opacity = interpolate(lf, [0, 10, 50], [0, 0.9, 0], { extrapolateRight: "clamp" });
        return (
          <div key={delay} style={{
            position: "absolute", inset: "12px", borderRadius: "50%",
            border: `3px solid ${color}`, transform: `scale(${scale})`, opacity,
          }} />
        );
      })}
      <div style={{ position: "absolute", inset: "22px", borderRadius: "50%", backgroundColor: color }} />
    </div>
  );
};

export const EmailConfirmation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emailScale = spring({ frame, fps, config: { damping: 24, stiffness: 90 }, from: 0.88, to: 1 });
  const emailOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [45, 70], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pingFrame = Math.max(0, frame - 55);

  return (
    <AbsoluteFill style={{ backgroundColor: "#F1F5F9", overflow: "hidden" }}>
      <style>{fontStyle}</style>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 900px 600px at 50% 50%, #ffffff80, transparent)" }} />

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${emailScale})`, opacity: emailOpacity, width: 1200 }}>
          {/* Email card */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 64px rgba(15,30,69,0.14), 0 4px 16px rgba(15,30,69,0.08)" }}>
            {/* Browser bar */}
            <div style={{ backgroundColor: "#E8EAED", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
                ))}
              </div>
              <div style={{ flex: 1, backgroundColor: "#D2D4D8", borderRadius: 5, padding: "4px 12px", marginLeft: 6 }}>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: "#5F6368" }}>mail.google.com</span>
              </div>
            </div>

            <div style={{ overflow: "hidden", maxHeight: 560 }}>
              <Img src={staticFile("screenshots/email-confirmation.png")} style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 160, right: 120 }}>
        <Ping frame={pingFrame} color="#10B981" />
      </div>

      <div style={{
        position: "absolute", bottom: 72, left: "50%",
        transform: `translateX(-50%) translateY(${labelY}px)`,
        opacity: labelOpacity, whiteSpace: "nowrap",
      }}>
        <div style={{ backgroundColor: colors.navy, borderRadius: 14, padding: "14px 32px", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✉️</span>
          <span style={{ fontFamily: fonts.body, fontSize: 19, fontWeight: 600, color: colors.white }}>
            Confirmation envoyée instantanément
          </span>
        </div>
      </div>

      <SceneFade />
    </AbsoluteFill>
  );
};
