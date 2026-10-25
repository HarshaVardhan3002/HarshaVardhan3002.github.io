import { useEffect, useState } from "react";

export function useReducedMotion() {
  const q = "(prefers-reduced-motion: reduce)";
  const [reduced, set] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => set(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** True when the browser can draw the TV. Without WebGL the site shows a plain page. */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
