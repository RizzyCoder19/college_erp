"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "fade";
}

export const AnimatedReveal: React.FC<AnimatedRevealProps> = ({
  children,
  delay = 0,
  className = "",
  direction = "up",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect user's reduced motion preference
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
        return;
      }
    }

    const element = elementRef.current;
    if (!element) return;

    // Trigger reveal when element is 10% visible or within 40px of viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect immediately so animation does not replay during ordinary navigation or scroll
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const getTransformClass = () => {
    if (direction === "up") {
      return isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";
    }
    return isVisible ? "opacity-100" : "opacity-0";
  };

  return (
    <div
      ref={elementRef}
      style={{
        transitionDuration: "500ms",
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all will-change-[transform,opacity] ${getTransformClass()} ${className}`}
    >
      {children}
    </div>
  );
};
