import React from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  frequency: number;
  isLoading: boolean;
}

const GradientAnimtion = ({ frequency, isLoading }: Props) => {
  const defaultSize = 400;
  const size = Math.max(defaultSize + frequency / 2, defaultSize);

  return (
    <div
      className={twMerge(
        "border-2 border-foreground/20 rounded-full dark:bg-neutral-950 bg-neutral-800 relative z-10 shadow-sm",
        isLoading && "bounce"
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        animation: !isLoading
          ? `rainbowPulse ${Math.max(
              3 - frequency / 100,
              0.5
            )}s infinite linear`
          : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-full rounded-full overflow-hidden"
        style={{
          animation: `rainbow 8s infinite linear`,
        }}
      >
        <div className="base blur-lg"></div>
        <div className="red blur-lg"></div>
        <div className="orange blur-lg"></div>
        <div className="green blur-lg"></div>
        <div className="pink blur-lg"></div>
        <div className="purple blur-lg"></div>
      </div>
    </div>
  );
};

export default GradientAnimtion;
