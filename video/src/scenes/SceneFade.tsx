import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SceneFade: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn  = interpolate(frame, [0, 12], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], { extrapolateLeft: "clamp" });
  const opacity = Math.max(fadeIn, fadeOut);

  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#000",
      opacity,
      zIndex: 999,
      pointerEvents: "none",
    }} />
  );
};
