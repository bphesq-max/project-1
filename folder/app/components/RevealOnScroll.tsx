"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export default function RevealOnScroll({
  as = "div",
  className = "",
  children,
  stagger = false,
}: {
  as?: "div" | "section";
  className?: string;
  children: ReactNode;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const resolvedClassName = `reveal-block${stagger ? " reveal-stagger" : ""}${isVisible ? " is-visible" : ""}${className ? ` ${className}` : ""}`;
  const handleRef = (node: HTMLElement | null) => {
    ref.current = node;
  };

  if (as === "section") {
    return (
      <section ref={handleRef} className={resolvedClassName}>
        {children}
      </section>
    );
  }

  return (
    <div ref={handleRef} className={resolvedClassName}>
      {children}
    </div>
  );
}
