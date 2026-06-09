import React from "react";
import { Composition } from "remotion";
import { CerydraVideo } from "./CerydraVideo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CerydraDemo"
        component={CerydraVideo}
        durationInFrames={2400}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
