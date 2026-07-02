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
import { Ping } from "./EmailConfirmation";
import { SceneFade } from "./SceneFade";


export const AvisGoogle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emailScale = spring({ frame, fps, config: { damping: 24, stiffness: 90 }, from: 0.88, to: 1 });
  const emailOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [40, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [40, 65], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pingFrame = Math.max(0, frame - 50);
  const starsOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#F1F5F9", overflow: "hidden" }}>
      <style>{fontStyle}</style>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 900px 600px at 50% 50%, #ffffff70, transparent)" }} />

      <div style={{
        position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
        opacity: tagOpacity, backgroundColor: `${colors.navy}12`, borderRadius: 30, padding: "7px 22px", whiteSpace: "nowrap",
      }}>
        <span style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: colors.navy, opacity: 0.65, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          ⭐ Demande d'avis automatique · après la visite
        </span>
      </div>

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${emailScale})`, opacity: emailOpacity, width: 1200 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 64px rgba(15,30,69,0.14), 0 4px 16px rgba(15,30,69,0.08)" }}>
            <div style={{ backgroundColor: "#E8EAED", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
                ))}
              </div>
              <div style={{ flex: 1, backgroundColor: "#D2D4D8", borderRadius: 5, padding: "4px 12px", marginLeft: 6 }}>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: "#5F6368" }}>Gmail — Merci pour votre visite</span>
              </div>
            </div>
            <div style={{ overflow: "hidden", maxHeight: 500 }}>
              <Img src={staticFile("screenshots/email-avis.png")} style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 155, right: 130 }}>
        <Ping frame={pingFrame} color="#F59E0B" />
      </div>

      {/* Stars */}
      <div style={{
        position: "absolute", bottom: 138, left: "50%",
        transform: "translateX(-50%)",
        opacity: starsOpacity, display: "flex", gap: 8,
      }}>
        {"★★★★★".split("").map((star, i) => (
          <span key={i} style={{
            fontSize: 38, color: "#F59E0B",
            filter: "drop-shadow(0 2px 6px #F59E0B50)",
            opacity: interpolate(frame, [80 + i * 8, 96 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}>{star}</span>
        ))}
      </div>

      <div style={{
        position: "absolute", bottom: 68, left: "50%",
        transform: `translateX(-50%) translateY(${labelY}px)`,
        opacity: labelOpacity, whiteSpace: "nowrap",
      }}>
        <div style={{ backgroundColor: colors.navy, borderRadius: 14, padding: "13px 30px", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 600, color: colors.white }}>
            Plus d'avis Google · sans effort de votre part
          </span>
        </div>
      </div>

      <SceneFade />
    </AbsoluteFill>
  );
};
