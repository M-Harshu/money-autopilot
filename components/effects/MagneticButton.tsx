"use client";

import {
  ButtonHTMLAttributes,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type MagneticButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  };

export default function MagneticButton({
  children,
  className = "",
  disabled = false,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const button = ref.current;

      if (!button || disabled) {
        return;
      }

      const rect =
        button.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      const distanceX =
        event.clientX - centerX;

      const distanceY =
        event.clientY - centerY;

      const distance = Math.sqrt(
        distanceX * distanceX +
          distanceY * distanceY,
      );

      const radius = 140;

      if (distance > radius) {
        setPosition({
          x: 0,
          y: 0,
        });

        return;
      }

      const strength =
        1 - distance / radius;

      setPosition({
        x: distanceX * strength * 0.18,
        y: distanceY * strength * 0.18,
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
  }, [disabled]);

  return (
    <button
      ref={ref}
      disabled={disabled}
      {...props}
      className={`transition-transform duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        ...props.style,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      {children}
    </button>
  );
}