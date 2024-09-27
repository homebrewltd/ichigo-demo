import React, { useEffect, useRef } from "react";

interface CanvasAnimationProps {
  frequency: number; // frequency input from audio
}

const CanvasAnimation: React.FC<CanvasAnimationProps> = ({ frequency }) => {
  console.log(frequency); // this like 84.0625, 92.3125, so increased by sound
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let max = 80;
  let count = 150;
  const p: [number, number, number][] = [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 400;
    ctx.fillRect(0, 0, 400, 400);

    // Initialize points
    let r = 0;
    for (let a = 0; a < max; a++) {
      p.push([Math.cos(r), Math.sin(r), 0]);
      r += (Math.PI * 2) / max;
    }
    for (let a = 0; a < max; a++) p.push([0, p[a][0], p[a][1]]);
    for (let a = 0; a < max; a++) p.push([p[a][1], 0, p[a][0]]);

    const rus = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      let tim = count / 5;

      for (let e = 0; e < 3; e++) {
        tim *= 1.7;
        let s = 1 - e / 3;
        let a = tim / 59;
        let yp = Math.cos(a);
        let yp2 = Math.sin(a);
        a = tim / 23;
        let xp = Math.cos(a);
        let xp2 = Math.sin(a);

        const p2: [number, number, number][] = [];
        for (let a = 0; a < p.length; a++) {
          let [x, y, z] = p[a];
          let y1 = y * yp + z * yp2;
          let z1 = y * yp2 - z * yp;
          let x1 = x * xp + z1 * xp2;
          z = x * xp2 - z1 * xp;
          z1 = Math.pow(2, z * s - frequency / 10);
          x = x1 * z1;
          y = y1 * z1;
          p2.push([x, y, z]);
        }

        s *= 120;

        // Adjust line width and color based on frequency
        const lineWidth = Math.min(10, Math.max(1, frequency / 10)); // Line width based on frequency

        for (let d = 0; d < 3; d++) {
          for (let a = 0; a < max; a++) {
            const b = p2[d * max + a];
            const c = p2[((a + 1) % max) + d * max];
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${((a / max) * 360) | 0}, 70%, 60%, 0.15)`;
            ctx.lineWidth = lineWidth;
            ctx.lineTo(b[0] * s + 200, b[1] * s + 200);
            ctx.lineTo(c[0] * s + 200, c[1] * s + 200);
            ctx.stroke();
          }
        }
      }
      count++;
      setTimeout(() => requestAnimationFrame(rus), 50); // Add a delay between frames
    };

    rus();
  }, [frequency]);

  return <canvas ref={canvasRef} />;
};

export default CanvasAnimation;
