import React from "react";
import { Composition } from "remotion";
import { CerydraVideo } from "./CerydraVideo";
import { LongVideo, LONG_DURATION } from "./v2/LongVideo";
import { ShortVideo, SHORT_DURATION } from "./v2/ShortVideo";

export const Root: React.FC = () => {
  return (
    <>
      {/* V2 — storyline Sophie & Marc, vrais screens */}
      <Composition
        id="CerydraLong"
        component={LongVideo}
        durationInFrames={LONG_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CerydraShort"
        component={ShortVideo}
        durationInFrames={SHORT_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* V1 — ancienne démo */}
      <Composition
        id="CerydraDemo"
        component={CerydraVideo}
        durationInFrames={2190}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
