import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { channels, person, tvChannels } from "../content";
import { hasWebGL, useReducedMotion } from "../hooks";
import { Mirror } from "./Mirror";
import { pages } from "./pages";
import { TvScene, type Action, type Dir } from "./scene";
import { TvPass } from "./TvPass";
import { screenToSource } from "./warp";

const CALM = { c1: "#3a2d86", c2: "#0f6a6c", c3: "#8b5a34" };
const ROGUE = { c1: "#f3e600", c2: "#0b0a04", c3: "#06343a" };

// Addresses: #/ is the menu, #/<slug> a channel (#/nimbus, #/about).
// The old #/tv/N links from the style lab still work.
const BY_SLUG = new Map(tvChannels.map((c) => [c.slug, c.ch]));
function routeCh(): number | null {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^tv\/(\d)/);
  if (m) return pages[Number(m[1])] ? Number(m[1]) : null;
  return BY_SLUG.get(h.split("/")[0]) ?? null;
}
const hashFor = (n: number) => `#/${channels.find((c) => c.ch === n)!.slug}`;
const MENU = "#/";
const GL = hasWebGL();

const ARROWS: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

/**
 * Direction C: the whole window is the TV. The menu shows every channel live;
 * picking one grows it until it fills the tube, and leaving shrinks the page
 * back into its tile. A hidden HTML copy keeps it usable with a keyboard and
 * a screen reader.
 */
export function TvView() {
  const reduced = useReducedMotion();
  const scene = useMemo(() => new TvScene(channels), []);
  const [ch, setCh] = useState<number | null>(routeCh);
  const [clear, setClear] = useState(false);
  const [rogue, setRogue] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const openedHere = useRef(false);
  const keyboard = useRef(false);
  const cameFrom = useRef<number | null>(null);
  const pal = rogue ? ROGUE : CALM;

  useEffect(() => scene.setOptions({ reduced, clear, rogue }), [scene, reduced, clear, rogue]);
  useEffect(() => {
    scene.wake();
    return () => scene.sleep();
  }, [scene]);

  useEffect(() => {
    // Old style-lab links become readable ones.
    const tidy = () => {
      const n = routeCh();
      if (/^#\/(tv|crt|glass)\b/.test(location.hash)) location.replace(n != null ? hashFor(n) : MENU);
    };
    tidy();
    document.documentElement.classList.toggle("tv-on", GL);
    const on = () => {
      tidy();
      setCh(routeCh());
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    const c = ch != null ? channels.find((x) => x.ch === ch) : undefined;
    document.title = c ? `${c.title} · ${person.name}` : person.name;
    if (!GL) window.scrollTo(0, 0);
    scene.go(ch);
    // Keyboard users land on the first control of the new screen.
    if (!keyboard.current) return;
    const id = ch == null ? (cameFrom.current ? `open-${cameFrom.current}` : null) : "back";
    if (ch != null) cameFrom.current = ch;
    if (id) requestAnimationFrame(() => mirror.current?.querySelector<HTMLElement>(`[data-hit="${id}"]`)?.focus());
  }, [scene, ch]);

  const back = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      history.back();
    } else location.replace(MENU);
  }, []);

  useEffect(() => {
    scene.onBack = back;
    return () => {
      scene.onBack = null;
    };
  }, [scene, back]);

  const tune = useCallback(
    (n: number) => {
      scene.wake();
      if (routeCh() == null) {
        openedHere.current = true;
        cameFrom.current = n;
        location.hash = hashFor(n);
      } else location.replace(hashFor(n));
    },
    [scene],
  );

  const act = useCallback(
    (a: Action, id: string) => {
      if (a.t === "open") tune(a.ch);
      else if (a.t === "back") back();
      else if (a.t === "toggle") (a.which === "clear" ? setClear : setRogue)((v) => !v);
      else {
        const el = mirror.current?.querySelector<HTMLAnchorElement>(`a[data-hit="${id}"]`);
        if (el) el.click();
        else window.open(a.href, "_blank", "noopener");
      }
    },
    [tune, back],
  );

  // Wheel scrolls the picture, not the page.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scene.viewHeight : 1;
      scene.scrollBy(e.deltaY * k);
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, [scene]);

  // The remote: 0 is the menu, 1 to 9 tune in, arrows choose, Escape goes back.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const onControl = !!t.closest("[data-hit]");
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        keyboard.current = true;
        e.preventDefault();
        const n = Number(k);
        if (n === 0) {
          if (routeCh() != null) back();
        } else if (n !== routeCh()) tune(n);
        return;
      }
      const page = routeCh() != null;
      if (!GL) {
        if (page && k === "Escape") back();
        return;
      }
      const H = scene.viewHeight;
      if (!page && ARROWS[k]) {
        e.preventDefault();
        keyboard.current = true;
        const cur = (document.activeElement as HTMLElement | null)?.dataset?.hit ?? null;
        const next = scene.neighbour(cur, ARROWS[k]);
        mirror.current?.querySelector<HTMLElement>(`[data-hit="${next}"]`)?.focus();
        return;
      }
      if (page && (k === "Escape" || (k === "Backspace" && !onControl))) {
        e.preventDefault();
        back();
        return;
      }
      const step: Record<string, number> = {
        ArrowDown: 90,
        ArrowUp: -90,
        PageDown: H * 0.85,
        PageUp: -H * 0.85,
      };
      if (!onControl) step[" "] = e.shiftKey ? -H * 0.85 : H * 0.85;
      if (step[k] != null) {
        e.preventDefault();
        scene.scrollBy(step[k]);
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        scene.scrollTo(k === "Home" ? "top" : "end");
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [scene, tune, back]);

  // Pointer: tap or click to choose; drag to scroll on touch screens.
  const drag = useRef<{ x: number; y: number; lastY: number; lastT: number; v: number; moved: boolean; touch: boolean } | null>(null);
  const toPicture = (e: PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return screenToSource(e.clientX - r.left, e.clientY - r.top, r.width, r.height, scene.curve);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    keyboard.current = false;
    scene.setFocus(null, false);
    scene.wake();
    const touch = e.pointerType !== "mouse";
    drag.current = { x: e.clientX, y: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false, touch };
    if (touch) {
      scene.fling(0);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.touch) {
      const dy = e.clientY - d.lastY;
      const t = performance.now();
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true;
      if (d.moved) {
        scene.scrollBy(-dy, true);
        d.v = (-dy / Math.max(1, t - d.lastT)) * 1000 * 0.6 + d.v * 0.4;
      }
      d.lastY = e.clientY;
      d.lastT = t;
      return;
    }
    const [x, y] = toPicture(e);
    const h = scene.hover(x, y);
    e.currentTarget.style.cursor = h ? "pointer" : "default";
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      const [x, y] = toPicture(e);
      const h = scene.hitAt(x, y);
      if (h) act(h.action, h.id);
    } else if (d.touch && performance.now() - d.lastT < 80) scene.fling(d.v);
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).dataset.hit;
    if (id) scene.setFocus(id, keyboard.current);
  };
  const onBlur = () => scene.setFocus(null, false);
  const onKeyUpCapture = (e: ReactKeyboardEvent) => {
    if (e.key === "Tab") {
      keyboard.current = true;
      const id = (document.activeElement as HTMLElement | null)?.dataset?.hit;
      if (id) scene.setFocus(id, true);
    }
  };

  const c = ch != null ? channels.find((x) => x.ch === ch) : undefined;
  const pg = ch != null ? pages[ch] : undefined;

  const mirrorProps = {
    channel: c,
    page: pg,
    plain: !GL,
    clear,
    rogue,
    onBack: back,
    onTune: tune,
    onClear: () => setClear((v) => !v),
    onRogue: () => setRogue((v) => !v),
  };

  if (!GL)
    return (
      <main ref={mirror} className="plain">
        <Mirror {...mirrorProps} />
      </main>
    );

  return (
    <main className="tv">
      <div
        ref={wrap}
        className="tv-screen"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => scene.hover(-1, -1)}
        aria-hidden
      >
        <ShaderGradientCanvas
          style={{ position: "absolute", inset: 0 }}
          pixelDensity={Math.min(2, window.devicePixelRatio || 1)}
          fov={45}
          lazyLoad={false}
          pointerEvents="none"
        >
          <ShaderGradient
            control="props"
            type="waterPlane"
            animate={reduced ? "off" : "on"}
            uTime={0.4}
            uSpeed={0.1}
            uStrength={1.6}
            uDensity={1.6}
            uFrequency={5.5}
            uAmplitude={0}
            cDistance={5}
            cPolarAngle={80}
            cAzimuthAngle={180}
            positionX={0}
            positionY={0}
            positionZ={0}
            rotationX={45}
            rotationY={0}
            rotationZ={0}
            color1={pal.c1}
            color2={pal.c2}
            color3={pal.c3}
            lightType="3d"
            brightness={rogue ? 1.1 : 0.85}
            reflection={0.1}
            grain="off"
          />
          <TvPass scene={scene} />
        </ShaderGradientCanvas>
      </div>

      <div ref={mirror} className="tv-a11y" onFocus={onFocus} onBlur={onBlur} onKeyUpCapture={onKeyUpCapture}>
        <Mirror {...mirrorProps} />
      </div>
    </main>
  );
}
