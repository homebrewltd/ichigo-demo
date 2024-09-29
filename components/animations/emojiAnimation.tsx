import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  frequency: number;
  isLoading: boolean;
}

const EmojiAnimation = ({ frequency, isLoading }: Props) => {
  const newHeight = 4 + (frequency * 24) / 100;

  return (
    <div className={twMerge("centerwrap", isLoading && "bounce")}>
      <div className="face">
        <span className="rotator">
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
