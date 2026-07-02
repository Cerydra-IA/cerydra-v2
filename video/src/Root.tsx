import React from "react";
import { Composition } from "remotion";
import { CerydraVideo } from "./CerydraVideo";

// 150+360+240+420+300+240+240+240 = 2190 frames = 73s
export const Root: React.FC = () => {
  return (
    <>
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
