import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GlobalStyle, S1Appel, S2Site, S3Widget, S4Email, S5Notif, S6Rappel, S7Avis, S8CTA } from "./scenes";

// 90s @30fps = 2700 frames
// S1 10s / S2 8s / S3 18s / S4 9s / S5 14s / S6 9s / S7 12s / S8 10s = 90s
const D = {
  s1: 300, s2: 240, s3: 540, s4: 270, s5: 420, s6: 270, s7: 360, s8: 300,
};
export const LONG_DURATION = Object.values(D).reduce((a, b) => a + b, 0);

export const LongVideo: React.FC = () => (
  <AbsoluteFill style={{ background: "#0F1E45" }}>
    <GlobalStyle />
    <Series>
      <Series.Sequence durationInFrames={D.s1}><S1Appel duration={D.s1} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s2}><S2Site duration={D.s2} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s3}><S3Widget duration={D.s3} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s4}><S4Email duration={D.s4} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s5}><S5Notif duration={D.s5} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s6}><S6Rappel duration={D.s6} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s7}><S7Avis duration={D.s7} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s8}><S8CTA duration={D.s8} /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
