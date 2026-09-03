"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue: number;
};

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      return;
    }

    const contextElement =
      canvasElement.getContext("2d");

    if (!contextElement) {
      return;
    }

    // These are now permanently narrowed to
    // non-null values for the rest of this effect.
    const canvas = canvasElement;
    const context = contextElement;

    const particles: Particle[] = [];

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let lastX = mouseX;
    let lastY = mouseY;

    let animationFrame = 0;

    function resize() {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      canvas.width =
        Math.floor(window.innerWidth * dpr);

      canvas.height =
        Math.floor(window.innerHeight * dpr);

      canvas.style.width =
        `${window.innerWidth}px`;

      canvas.style.height =
        `${window.innerHeight}px`;

      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );
    }

    function move(event: MouseEvent) {
      const nextX = event.clientX;
      const nextY = event.clientY;

      const distance = Math.hypot(
        nextX - lastX,
        nextY - lastY,
      );

      const amount = Math.min(
        Math.floor(distance / 4),
        12,
      );

      for (let i = 0; i < amount; i++) {
        const progress =
          amount === 0 ? 0 : i / amount;

        particles.push({
          x:
            lastX +
            (nextX - lastX) * progress,

          y:
            lastY +
            (nextY - lastY) * progress,

          vx:
            (Math.random() - 0.5) * 1.8,

          vy:
            (Math.random() - 0.5) * 1.8,

          life: 1,

          size:
            Math.random() * 3.5 + 1,

          hue:
            Math.random() * 360,
        });
      }

      mouseX = nextX;
      mouseY = nextY;

      lastX = nextX;
      lastY = nextY;
    }

    function animate() {
      context.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      );

      /*
       * CURSOR GLOW
       */

      const glow =
        context.createRadialGradient(
          mouseX,
          mouseY,
          0,
          mouseX,
          mouseY,
          100,
        );

      glow.addColorStop(
        0,
        "rgba(255,255,255,.20)",
      );

      glow.addColorStop(
        0.15,
        "rgba(34,211,238,.14)",
      );

      glow.addColorStop(
        0.4,
        "rgba(217,70,239,.06)",
      );

      glow.addColorStop(
        1,
        "rgba(0,0,0,0)",
      );

      context.fillStyle = glow;

      context.beginPath();

      context.arc(
        mouseX,
        mouseY,
        100,
        0,
        Math.PI * 2,
      );

      context.fill();

      /*
       * PARTICLES
       */

      for (
        let i = particles.length - 1;
        i >= 0;
        i--
      ) {
        const particle = particles[i];

        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.vx *= 0.97;
        particle.vy *= 0.97;

        particle.life -= 0.025;

        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha =
          particle.life * 0.9;

        if (particle.hue < 120) {
          context.fillStyle =
            `rgba(34, 211, 238, ${alpha})`;
        } else if (
          particle.hue < 240
        ) {
          context.fillStyle =
            `rgba(217, 70, 239, ${alpha})`;
        } else {
          context.fillStyle =
            `rgba(255, 255, 255, ${alpha})`;
        }

        context.shadowBlur = 12;

        context.shadowColor =
          context.fillStyle;

        context.beginPath();

        context.arc(
          particle.x,
          particle.y,
          particle.size *
            particle.life,
          0,
          Math.PI * 2,
        );

        context.fill();
      }

      context.shadowBlur = 0;

      animationFrame =
        requestAnimationFrame(animate);
    }

    resize();
    animate();

    window.addEventListener(
      "resize",
      resize,
    );

    window.addEventListener(
      "mousemove",
      move,
      { passive: true },
    );

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        resize,
      );

      window.removeEventListener(
        "mousemove",
        move,
      );
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[80] h-full w-full"
      aria-hidden="true"
    />
  );
}