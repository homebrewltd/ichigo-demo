import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  frequency: number;
  isLoading: boolean;
  isPlayingAudio: boolean;
}

const EmojiAnimation = ({ frequency, isLoading, isPlayingAudio }: Props) => {
  const defaultHeight = 4;
  const newHeight = isPlayingAudio ? 4 + (frequency * 24) / 100 : defaultHeight;

  return (
    <div className={twMerge("centerwrap", isLoading && "bounce")}>
      <div className="face">
        <span
          className={twMerge("rotator-straw", !isPlayingAudio && "run-animate")}
        >
          <span className="eyes" />
          <div
            className="absolute mouth w-full h-full bg-white top-44 left-10 transition-[width] ease-in-out duration-150 rotate-360 rounded-xl"
            style={{
              width: `24px`,
              height: `${newHeight}px`,
            }}
          />
        </span>
      </div>
    </div>
  );
};

export default EmojiAnimation;
