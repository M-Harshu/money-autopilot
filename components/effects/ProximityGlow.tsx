"use client";

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type ProximityGlowProps = {
  children: ReactNode;
  className?: string;
  radius?: number;
};

export default function ProximityGlow({
  children,
  className = "",
  radius = 180,
}: ProximityGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [style, setStyle] = useState({
    x: 0,
    y: 0,
    distance: radius,
  });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const element = ref.current;

      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      const dx =
        event.clientX - centerX;

      const dy =
        event.clientY - centerY;

      const distance = Math.sqrt(
        dx * dx + dy * dy,
      );

      if (distance > radius) {
        setStyle({
          x: 0,
          y: 0,
          distance,
        });

        return;
      }

      const strength =
        1 - distance / radius;

      setStyle({
        x: dx * strength * 0.12,
        y: dy * strength * 0.12,
        distance,
      });
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );
    };
  }, [radius]);

  const intensity = Math.max(
    0,
    Math.min(
      1,
      1 - style.distance / radius,
    ),
  );

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        transform: `
          translate3d(
            ${style.x}px,
            ${style.y}px,
            0
          )
        `,
        transition:
          "transform 120ms ease-out",
      }}
    >
      {/* PROXIMITY GLOW */}

      <div
        className="pointer-events-none absolute -inset-8 rounded-[inherit] bg-cyan-400/20 blur-3xl"
        style={{
          opacity: intensity * 0.55,
          transition: "opacity 150ms ease-out",
        }}
      />

      {/* BORDER ENERGY */}

      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] border border-cyan-300/60"
        style={{
          opacity: intensity,
        }}
      />

      <div className="relative">
        {children}
      </div>
    </div>
  );
}