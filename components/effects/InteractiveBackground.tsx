"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
};

export default function InteractiveBackground() {
  const [mouse, setMouse] = useState({
    x: -500,
    y: -500,
    active: false,
  });

  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let particleId = 0;
    let lastSpawn = 0;

    function handleMove(event: MouseEvent) {
      const x = event.clientX;
      const y = event.clientY;

      setMouse({
        x,
        y,
        active: true,
      });

      const now = Date.now();

      if (now - lastSpawn < 35) {
        return;
      }

      lastSpawn = now;

      const newParticles: Particle[] =
        Array.from({ length: 3 }, () => {
          particleId += 1;

          return {
            id: particleId,
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            size: Math.random() * 8 + 3,
            color:
              Math.random() > 0.5
                ? "cyan"
                : "pink",
            angle: Math.random() * 360,
          };
        });

      setParticles((current) => [
        ...current.slice(-70),
        ...newParticles,
      ]);
    }

    function handleLeave() {
      setMouse((current) => ({
        ...current,
        active: false,
      }));
    }

    window.addEventListener(
      "mousemove",
      handleMove,
    );

    window.addEventListener(
      "mouseout",
      handleLeave,
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMove,
      );

      window.removeEventListener(
        "mouseout",
        handleLeave,
      );
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setParticles((current) =>
        current.slice(3),
      );
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      {/* MOVING BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-cyan-500/[0.10] blur-[140px]"
          style={{
            animation:
              "moneyOrbOne 9s ease-in-out infinite",
          }}
        />

        <div
          className="absolute -right-40 top-[10%] h-[45rem] w-[45rem] rounded-full bg-fuchsia-500/[0.10] blur-[150px]"
          style={{
            animation:
              "moneyOrbTwo 12s ease-in-out infinite",
          }}
        />

        <div
          className="absolute bottom-[-20rem] left-[25%] h-[45rem] w-[45rem] rounded-full bg-violet-500/[0.09] blur-[150px]"
          style={{
            animation:
              "moneyOrbThree 15s ease-in-out infinite",
          }}
        />

        {/* GRID */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize:
              "64px 64px",
          }}
        />
      </div>

      {/* HUGE MOUSE GLOW */}
      {mouse.active && (
        <div
          className="pointer-events-none fixed z-[40] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: mouse.x,
            top: mouse.y,
            background:
              "radial-gradient(circle, rgba(34,211,238,.20) 0%, rgba(217,70,239,.10) 35%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      )}

      {/* MOUSE CORE */}
      {mouse.active && (
        <div
          className="pointer-events-none fixed z-[50] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,1)]"
          style={{
            left: mouse.x,
            top: mouse.y,
          }}
        />
      )}

      {/* OUTER RING */}
      {mouse.active && (
        <div
          className="pointer-events-none fixed z-[49] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/40"
          style={{
            left: mouse.x,
            top: mouse.y,
          }}
        />
      )}

      {/* PARTICLES */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="pointer-events-none fixed z-[45] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            background:
              particle.color === "cyan"
                ? "#67e8f9"
                : "#f0abfc",
            boxShadow:
              particle.color === "cyan"
                ? "0 0 15px #22d3ee"
                : "0 0 15px #d946ef",
            opacity: 0.8,
            transform: `translate(-50%, -50%) rotate(${particle.angle}deg)`,
          }}
        />
      ))}

      <style jsx global>{`
        @keyframes moneyOrbOne {
          0% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }

          50% {
            transform: translate3d(
                160px,
                120px,
                0
              )
              scale(1.15);
          }

          100% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }
        }

        @keyframes moneyOrbTwo {
          0% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }

          50% {
            transform: translate3d(
                -180px,
                100px,
                0
              )
              scale(0.9);
          }

          100% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }
        }

        @keyframes moneyOrbThree {
          0% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }

          50% {
            transform: translate3d(
                120px,
                -100px,
                0
              )
              scale(1.1);
          }

          100% {
            transform: translate3d(0, 0, 0)
              scale(1);
          }
        }
      `}</style>
    </>
  );
}