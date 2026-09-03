"use client";

import {
  type MouseEvent,
  type ReactNode,
  useState,
} from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

export default function TiltCard({
  children,
  className = "",
}: TiltCardProps) {
  const [transform, setTransform] =
    useState("perspective(1000px) rotateX(0deg) rotateY(0deg)");

  const [glow, setGlow] = useState({
    x: 50,
    y: 50,
  });

  function handleMouseMove(
    event: MouseEvent<HTMLDivElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY =
      ((x - centerX) / centerX) * 8;

    const rotateX =
      ((centerY - y) / centerY) * 8;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    );

    setGlow({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  }

  function handleMouseLeave() {
    setTransform(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    );

    setGlow({
      x: 50,
      y: 50,
    });
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transform-gpu overflow-hidden ${className}`}
      style={{
        transform,
        transition:
          "transform 180ms cubic-bezier(.2,.8,.2,1)",
      }}
    >
      {/* Cursor-following light */}
      <div
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(
            circle at ${glow.x}% ${glow.y}%,
            rgba(34,211,238,.16),
            rgba(217,70,239,.08) 25%,
            transparent 55%
          )`,
        }}
      />

      {/* Edge glow */}
      <div
        className="pointer-events-none absolute -inset-px z-10 rounded-[inherit] opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(
            circle at ${glow.x}% ${glow.y}%,
            rgba(34,211,238,.45),
            transparent 35%
          )`,
          maskImage:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />

      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
} 	