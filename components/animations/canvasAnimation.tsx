"use client";

import { useEffect, useRef } from "react";

interface Props {
  frequency: number;
  isLoading: boolean;
}

export default function Component({ frequency, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const defaultSize = 400;
  const size = Math.max(defaultSize + frequency / 2, defaultSize);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.height = 400;
    ctx.fillRect(0, 0, 400, 400);

    const max = 80;
    let count = 150;
    const p: [number, number, number][] = [];

    let r = 0;
    for (let a = 0; a < max; a++) {
      p.push([Math.cos(r), Math.sin(r), 0]);
      r += (Math.PI * 2) / max;
    }
    for (let a = 0; a < max; a++) p.push([0, p[a][0], p[a][1]]);
    for (let a = 0; a < max; a++) p.push([p[a][1], 0, p[a][0]]);

    function rus() {
      if (!ctx) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      if (canvas) {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.globalCompositeOperation = "lighter";

      let tim = count / 10;

      for (let e = 0; e < 3; e++) {
        tim *= 1.7;
        const s = 1 - e / 3;
        let a = tim / 59;
        const yp = Math.cos(a);
        const yp2 = Math.sin(a);
        a = tim / 23;
        const xp = Math.cos(a);
        const xp2 = Math.sin(a);
        const p2: [number, number, number][] = [];

        for (let a = 0; a < p.length; a++) {
          let [x, y, z] = p[a];
          const y1 = y * yp + z * yp2;
          const z1 = y * yp2 - z * yp;
          const x1 = x * xp + z1 * xp2;
          z = x * xp2 - z1 * xp;
          const z2 = Math.pow(2, z * s);
          x = x1 * z2;
          y = y1 * z2;
          p2.push([x, y, z]);
        }

        const scale = s * 160; // Adjusted to fit 400x400 canvas
        const centerX = 200;
        const centerY = 200;

        for (let d = 0; d < 3; d++) {
          for (let a = 0; a < max; a++) {
            const b = p2[d * max + a];
            const c = p2[((a + 1) % max) + d * max];
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${((a / max) * 360) | 0},70%,60%,0.15)`;
            ctx.lineWidth = Math.pow(6, b[2]);
            ctx.lineTo(b[0] * scale + centerX, b[1] * scale + centerY);
            ctx.lineTo(c[0] * scale + centerX, c[1] * scale + centerY);
            ctx.stroke();
          }
        }
      }

      count++;
      requestAnimationFrame(rus);
    }

    rus();

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="rounded-full" width={400} height={400} />
  );
}
