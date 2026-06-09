import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Intro } from "./scenes/Intro";
import { Widget } from "./scenes/Widget";
import { EmailConfirmation } from "./scenes/EmailConfirmation";
import { Rappel24h } from "./scenes/Rappel24h";
import { Dashboard } from "./scenes/Dashboard";
import { ArgFinal } from "./scenes/ArgFinal";

export const CerydraVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        {/* Scene 1: Intro — 10s = 300 frames */}
        <Series.Sequence durationInFrames={300}>
          <Intro />
        </Series.Sequence>

        {/* Scene 2: Widget — 20s = 600 frames */}
        <Series.Sequence durationInFrames={600}>
          <Widget />
        </Series.Sequence>

        {/* Scene 3: EmailConfirmation — 10s = 300 frames */}
        <Series.Sequence durationInFrames={300}>
          <EmailConfirmation />
        </Series.Sequence>

        {/* Scene 4: Rappel24h — 10s = 300 frames */}
        <Series.Sequence durationInFrames={300}>
          <Rappel24h />
        </Series.Sequence>

        {/* Scene 5: Dashboard — 20s = 600 frames */}
        <Series.Sequence durationInFrames={600}>
          <Dashboard />
        </Series.Sequence>

        {/* Scene 6: ArgFinal — 10s = 300 frames */}
        <Series.Sequence durationInFrames={300}>
          <ArgFinal />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
