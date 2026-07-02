import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Intro } from "./scenes/Intro";
import { Widget } from "./scenes/Widget";
import { EmailConfirmation } from "./scenes/EmailConfirmation";
import { DashboardScene } from "./scenes/DashboardScene";
import { StatsScene } from "./scenes/StatsScene";
import { Rappel24h } from "./scenes/Rappel24h";
import { AvisGoogle } from "./scenes/AvisGoogle";
import { ArgFinal } from "./scenes/ArgFinal";

export const CerydraVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        {/* Scene 1: Intro — 5s = 150f */}
        <Series.Sequence durationInFrames={150}>
          <Intro />
        </Series.Sequence>

        {/* Scene 2: Widget — 12s = 360f */}
        <Series.Sequence durationInFrames={360}>
          <Widget />
        </Series.Sequence>

        {/* Scene 3: Email confirmation — 8s = 240f */}
        <Series.Sequence durationInFrames={240}>
          <EmailConfirmation />
        </Series.Sequence>

        {/* Scene 4: Dashboard réservations — 14s = 420f */}
        <Series.Sequence durationInFrames={420}>
          <DashboardScene />
        </Series.Sequence>

        {/* Scene 5: Statistiques — 10s = 300f */}
        <Series.Sequence durationInFrames={300}>
          <StatsScene />
        </Series.Sequence>

        {/* Scene 6: Rappel 24h — 8s = 240f */}
        <Series.Sequence durationInFrames={240}>
          <Rappel24h />
        </Series.Sequence>

        {/* Scene 7: Avis Google — 8s = 240f */}
        <Series.Sequence durationInFrames={240}>
          <AvisGoogle />
        </Series.Sequence>

        {/* Scene 8: Outro — 8s = 240f */}
        <Series.Sequence durationInFrames={240}>
          <ArgFinal />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
