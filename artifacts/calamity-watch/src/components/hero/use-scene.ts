import { useCallback, useEffect, useRef, useState } from "react";
import { LOOP, RUN_END } from "./script";

/** Honour the OS setting and the ?motion=reduce override that main.tsx writes on <html>. */
export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.getAttribute("data-motion") === "reduce") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function startSecond(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(new URLSearchParams(window.location.search).get("t"));
  return Number.isFinite(v) && v > 0 ? Math.min(v, LOOP - 0.1) : 0;
}

/**
 * The scene clock: seconds since the scene started, ticking at 12 Hz while the hero is on screen and the tab is
 * visible, looping at LOOP seconds. Reduced motion parks it on the finished picture. `pause` and `restart` are for the
 * readout's control.
 */
export function useSceneClock(hostRef: React.RefObject<HTMLElement | null>) {
  const reduced = reducedMotion();
  // ?t=<seconds> starts the clock part-way through, for screenshots and review.
  const t0 = reduced ? RUN_END : startSecond();
  const [t, setT] = useState(t0);
  const [paused, setPaused] = useState(reduced);
  const [visible, setVisible] = useState(true);
  const startRef = useRef<number | null>(null);
  const offsetRef = useRef(t0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [hostRef]);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = !paused && visible && !reduced;
  useEffect(() => {
    if (!running) {
      startRef.current = null;
      return;
    }
    let raf = 0;
    let lastTick = -1;
    const frame = (now: number) => {
      if (startRef.current === null) startRef.current = now - offsetRef.current * 1000;
      let s = (now - startRef.current) / 1000;
      if (s >= LOOP) {
        startRef.current = now;
        s = 0;
      }
      offsetRef.current = s;
      const tick = Math.floor(s * 12);
      if (tick !== lastTick) {
        lastTick = tick;
        setT(s);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const toggle = useCallback(() => setPaused((p) => !p), []);
  const restart = useCallback(() => {
    offsetRef.current = 0;
    startRef.current = null;
    setT(0);
    setPaused(false);
  }, []);

  return { t, paused, reduced, toggle, restart };
}
