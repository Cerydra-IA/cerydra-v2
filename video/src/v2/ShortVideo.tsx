import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GlobalStyle, S1Appel, S3Widget, S5Notif, S7Avis, S8CTA } from "./scenes";

// 30s @30fps = 900 frames — format vertical 1080x1920
// S1 6s / S3 8s / S5 6s / S7 5s / S8 5s = 30s
const D = { s1: 180, s3: 240, s5: 180, s7: 150, s8: 150 };
export const SHORT_DURATION = Object.values(D).reduce((a, b) => a + b, 0);

export const ShortVideo: React.FC = () => (
  <AbsoluteFill style={{ background: "#0F1E45" }}>
    <GlobalStyle />
    <Series>
      <Series.Sequence durationInFrames={D.s1}><S1Appel duration={D.s1} vertical /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s3}><S3Widget duration={D.s3} vertical playbackRate={4} /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s5}><S5Notif duration={D.s5} vertical /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s7}><S7Avis duration={D.s7} vertical /></Series.Sequence>
      <Series.Sequence durationInFrames={D.s8}><S8CTA duration={D.s8} vertical /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
