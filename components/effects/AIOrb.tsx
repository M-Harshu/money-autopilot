"use client";

import { useEffect, useState } from "react";

export default function AIOrb() {
  const [mouse, setMouse] = useState({
    x: 0,
    y: 0,
  });

  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const x =
        (event.clientX / window.innerWidth - 0.5) *
        2;

      const y =
        (event.clientY / window.innerHeight - 0.5) *
        2;

      setMouse({
        x,
        y,
      });
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove,
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );
    };
  }, []);

  return (
    <div
      className="relative flex h-[360px] w-[360px] items-center justify-center"
      style={{
        perspective: "1000px",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* OUTER ENERGY FIELD */}

      <div
        className="absolute rounded-full transition-all duration-500"
        style={{
          width: hovering ? 350 : 300,
          height: hovering ? 350 : 300,

          background:
            "radial-gradient(circle, rgba(34,211,238,.18), rgba(139,92,246,.08) 40%, transparent 70%)",

          filter: "blur(20px)",

          transform: `
            translate3d(
              ${mouse.x * 12}px,
              ${mouse.y * 12}px,
              0
            )
          `,
        }}
      />

      {/* PURPLE AURA */}

      <div
        className="absolute h-[270px] w-[270px] rounded-full bg-fuchsia-500/10 blur-[70px] transition-all duration-500"
        style={{
          transform: `
            translate3d(
              ${mouse.x * -18}px,
              ${mouse.y * -18}px,
              0
            )
          `,

          opacity: hovering ? 0.9 : 0.55,
        }}
      />

      {/* ORB */}

      <div
        className="relative h-[210px] w-[210px] rounded-full transition-all duration-300"
        style={{
          transform: `
            perspective(800px)
            rotateX(${mouse.y * -12}deg)
            rotateY(${mouse.x * 12}deg)
            translate3d(
              ${mouse.x * 8}px,
              ${mouse.y * 8}px,
              0
            )
            scale(${hovering ? 1.06 : 1})
          `,

          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(103,232,249,.85) 12%, rgba(34,211,238,.55) 28%, rgba(139,92,246,.5) 48%, rgba(217,70,239,.25) 68%, rgba(0,0,0,.9) 100%)",

          boxShadow: hovering
            ? "0 0 40px rgba(34,211,238,.7), 0 0 100px rgba(217,70,239,.35), inset 0 0 50px rgba(255,255,255,.2)"
            : "0 0 30px rgba(34,211,238,.4), 0 0 80px rgba(139,92,246,.25), inset 0 0 40px rgba(255,255,255,.12)",
        }}
      >
        {/* INNER CORE */}

        <div
          className="absolute left-[28%] top-[22%] h-[55px] w-[55px] rounded-full bg-white/80 blur-xl"
        />

        {/* ENERGY RING */}

        <div
          className="absolute inset-[-14px] rounded-full border border-cyan-300/30"
          style={{
            transform: `
              rotateX(${mouse.y * 18}deg)
              rotateY(${mouse.x * -18}deg)
            `,
          }}
        />

        {/* SECOND ENERGY RING */}

        <div
          className="absolute inset-[-30px] rounded-full border border-fuchsia-400/15"
          style={{
            transform: `
              rotateX(${mouse.y * -25}deg)
              rotateY(${mouse.x * 25}deg)
            `,
          }}
        />

        {/* SCANNING LINE */}

        <div
          className="absolute left-[10%] right-[10%] top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
          style={{
            animation:
              "orbScan 2.5s ease-in-out infinite",
          }}
        />

        {/* CORE DOT */}

        <div
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,1)]"
        />
      </div>

      {/* ORBITING PARTICLES */}

      <div
        className="absolute inset-0"
        style={{
          transform: `
            rotateX(${mouse.y * 8}deg)
            rotateY(${mouse.x * 8}deg)
          `,
        }}
      >
        <span className="absolute left-[12%] top-[35%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,1)]" />

        <span className="absolute right-[13%] top-[28%] h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,1)]" />

        <span className="absolute bottom-[25%] left-[20%] h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_15px_rgba(139,92,246,1)]" />

        <span className="absolute bottom-[18%] right-[24%] h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_15px_rgba(34,211,238,1)]" />
      </div>

      <style jsx>{`
        @keyframes orbScan {
          0% {
            transform: translateY(-55px);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          50% {
            opacity: 1;
          }

          80% {
            opacity: 0;
          }

          100% {
            transform: translateY(55px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}