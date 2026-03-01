import React, { useEffect, useState } from "react";

function getScrollTopVisible(threshold) {
  if (typeof window === "undefined") return false;
  return (window.scrollY || window.pageYOffset || 0) > threshold;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ScrollToTopButton({ threshold = 500 }) {
  const [visible, setVisible] = useState(() => getScrollTopVisible(threshold));

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setVisible(getScrollTopVisible(threshold));
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const handleClick = () => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  };

  return (
    <div className={visible ? "scroll-top visible" : "scroll-top"}>
      <button
        type="button"
        className="btn btn-primary scroll-top-trigger"
        onClick={handleClick}
        aria-label="Наверх"
        title="Наверх"
      >
        ↑
      </button>
    </div>
  );
}

export default ScrollToTopButton;
