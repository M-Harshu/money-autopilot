"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
  rotation: number;
  shape: "circle" | "square";
};

type ColorBombProps = {
  trigger: boolean;
};

export default function ColorBomb({
  trigger,
}: ColorBombProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    const nextParticles: Particle[] = Array.from(
      { length: 180 },
      (_, index) => ({
        id: index,
        x: 50 + (Math.random() - 0.5) * 10,
        y: 50 + (Math.random() - 0.5) * 10,
        size: Math.random() * 8 + 3,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 45 + 12,
        delay: Math.random() * 0.12,
        duration: Math.random() * 0.9 + 0.8,
        rotation: Math.random() * 720 - 360,
        shape:
          Math.random() > 0.72
            ? "square"
            : "circle",
      }),
    );

    setParticles(nextParticles);
    setActive(true);

    const timer = window.setTimeout(() => {
      setActive(false);
      setParticles([]);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [trigger]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {/* FLASH */}

      <div
        className="absolute inset-0 bg-white"
        style={{
          animation:
            "bombFlash 700ms ease-out forwards",
        }}
      />

      {/* CYAN SHOCKWAVE */}

      <div
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-cyan-300"
        style={{
          animation:
            "shockwave 1.2s cubic-bezier(.1,.7,.2,1) forwards",
        }}
      />

      {/* MAGENTA SHOCKWAVE */}

      <div
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fuchsia-400"
        style={{
          animation:
            "shockwave 1.4s .08s cubic-bezier(.1,.7,.2,1) forwards",
        }}
      />

      {/* CENTRAL ENERGY */}

      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, white 0%, rgba(103,232,249,.9) 20%, rgba(217,70,239,.6) 45%, transparent 72%)",
          filter: "blur(5px)",
          animation:
            "coreExplosion 900ms cubic-bezier(.15,.8,.2,1) forwards",
        }}
      />

      {/* PARTICLES */}

      {particles.map((particle) => {
        const endX =
          Math.cos(particle.angle) *
          particle.distance;

        const endY =
          Math.sin(particle.angle) *
          particle.distance;

        const hue =
          particle.id % 5;

        const background =
          hue === 0
            ? "rgb(34,211,238)"
            : hue === 1
              ? "rgb(217,70,239)"
              : hue === 2
                ? "rgb(250,204,21)"
                : hue === 3
                  ? "rgb(244,114,182)"
                  : "rgb(255,255,255)";

        return (
          <span
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: particle.size,
              height: particle.size,
              background,
              borderRadius:
                particle.shape === "circle"
                  ? "9999px"
                  : "2px",

              boxShadow: `0 0 ${
                particle.size * 2
              }px ${background}`,

              animation: `particleExplosion ${
                particle.duration
              }s ${particle.delay}s cubic-bezier(.12,.75,.18,1) forwards`,

              ["--x" as string]: `${endX}vw`,
              ["--y" as string]: `${endY}vh`,
              ["--rotation" as string]: `${particle.rotation}deg`,
            }}
          />
        );
      })}

      {/* COLOR CLOUDS */}

      <div
        className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/30 blur-[100px]"
        style={{
          animation:
            "cloudExplosion 1.2s ease-out forwards",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-[100px]"
        style={{
          animation:
            "cloudExplosion 1.35s .05s ease-out forwards",
        }}
      />

      <style jsx>{`
        @keyframes bombFlash {
          0% {
            opacity: 0.95;
          }

          12% {
            opacity: 0.85;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes shockwave {
          0% {
            transform:
              translate(-50%, -50%)
              scale(0.2);
            opacity: 1;
          }

          100% {
            transform:
              translate(-50%, -50%)
              scale(35);
            opacity: 0;
          }
        }

        @keyframes coreExplosion {
          0% {
            transform:
              translate(-50%, -50%)
              scale(0.2);
            opacity: 1;
          }

          30% {
            transform:
              translate(-50%, -50%)
              scale(3);
            opacity: 1;
          }

          100% {
            transform:
              translate(-50%, -50%)
              scale(0);
            opacity: 0;
          }
        }

        @keyframes particleExplosion {
          0% {
            transform:
              translate(-50%, -50%)
              translate3d(0, 0, 0)
              rotate(0deg)
              scale(0);
            opacity: 1;
          }

          12% {
            transform:
              translate(-50%, -50%)
              translate3d(0, 0, 0)
              rotate(20deg)
              scale(1);
            opacity: 1;
          }

          100% {
            transform:
              translate(-50%, -50%)
              translate3d(var(--x), var(--y), 0)
              rotate(var(--rotation))
              scale(0.15);
            opacity: 0;
          }
        }

        @keyframes cloudExplosion {
          0% {
            transform:
              translate(-50%, -50%)
              scale(0.2);
            opacity: 0;
          }

          25% {
            opacity: 0.8;
          }

          100% {
            transform:
              translate(-50%, -50%)
              scale(5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}