// The picture on the TV. Lays out the menu and the project pages in CSS pixels
// and paints them into one canvas that the CRT pass samples. Glass panels and
// click areas come out of the same layout, so what you see, what the glass
// bends and what you can click always line up.

import { cta, person, type Channel } from "../content";
import { Deck, DECK_H, DECK_W } from "../crt/deck";
import { pages } from "./pages";

export type Box = { x: number; y: number; w: number; h: number };
export type GlassRect = Box & { r: number; tint: string; tintAmt: number; bend: number; frost: number; alpha: number };
export type Action =
  | { t: "open"; ch: number }
  | { t: "link"; href: string }
  | { t: "back" }
  | { t: "toggle"; which: "clear" | "rogue" };
export type Hit = { id: string; box: Box; r: number; action: Action; hint?: { x: number; y: number } };
export type Fx = { power: number; static: number; roll: number; split: number; flash: number };
export type Frame = { glass: GlassRect[]; dim: number };
export type Dir = "left" | "right" | "up" | "down";

type Style = {
  family: string;
  weight: number;
  size: number;
  lh: number;
  color: string;
  stretch?: CanvasFontStretch;
  track?: number;
};

type TextItem = { k: "text"; x: number; y: number; text: string; s: Style; align?: CanvasTextAlign; chroma?: boolean };
type Item =
  | TextItem
  | { k: "media"; ch: number; box: Box; r: number; fit: "cover" | "contain" }
  | { k: "fill"; box: Box; r: number; color: string }
  | { k: "scrim"; box: Box; from: string; to: string }
  | { k: "clock"; x: number; y: number; s: Style; align: CanvasTextAlign }
  | { k: "progress"; box: Box; color: string; track: string };

type Layout = { items: Item[]; glass: GlassRect[]; hits: Hit[]; height: number; media: Map<number, Box> };
type Tr = { kind: "open" | "close" | "switch"; at: number; dur: number; from: number; to?: number; swapped?: boolean; src?: Box };

const DISPLAY = "Archivo, 'Arial Narrow', sans-serif";
const BODY = "'Schibsted Grotesk', system-ui, sans-serif";
const MONO = "VT323, ui-monospace, monospace";

/** Wheel distance past the end of a page that takes you back to the menu. */
const OVER = 460;

type Pal = {
  ink: string;
  body: string;
  dim: string;
  faint: string;
  accent: string;
  osd: string;
  cyan: string;
  ring: string;
  tint: string;
  tintAmt: number;
  bgMenu: number;
  bgPage: number;
};

const CALM: Pal = {
  ink: "#f6f1e7",
  body: "rgba(246,241,231,0.86)",
  dim: "rgba(246,241,231,0.64)",
  faint: "rgba(246,241,231,0.44)",
  accent: "#ffe94a",
  osd: "#46ff7c",
  cyan: "#72f4ff",
  ring: "rgba(246,241,231,0.55)",
  tint: "#0c0b16",
  tintAmt: 0.42,
  bgMenu: 1,
  bgPage: 0.5,
};

const ROGUE: Pal = {
  ink: "#f7f0c4",
  body: "rgba(247,240,196,0.88)",
  dim: "rgba(247,240,196,0.66)",
  faint: "rgba(247,240,196,0.46)",
  accent: "#f3e600",
  osd: "#f3e600",
  cyan: "#00e5ff",
  ring: "rgba(243,230,0,0.6)",
  tint: "#0d0b00",
  tintAmt: 0.62,
  bgMenu: 0.72,
  bgPage: 0.4,
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const bell = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));
const smooth = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const pad2 = (n: number) => String(n).padStart(2, "0");
const blank = (): Layout => ({ items: [], glass: [], hits: [], height: 0, media: new Map() });
const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function setFont(ctx: CanvasRenderingContext2D, s: Style) {
  ctx.font = `${s.weight} ${s.size}px ${s.family}`;
  // Setting `font` resets the width, so set the width after it.
  if ("fontStretch" in ctx) ctx.fontStretch = s.stretch ?? "normal";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${s.track ?? 0}px`;
}

function shift(L: Layout, dy: number) {
  for (const it of L.items) {
    if ("box" in it) it.box.y += dy;
    else it.y += dy;
  }
  for (const g of L.glass) g.y += dy;
  for (const h of L.hits) {
    h.box.y += dy;
    if (h.hint) h.hint.y += dy;
  }
  for (const b of L.media.values()) b.y += dy;
}

function merge(into: Layout, from: Layout) {
  into.items.push(...from.items);
  into.glass.push(...from.glass);
  into.hits.push(...from.hits);
  from.media.forEach((v, k) => into.media.set(k, v));
}

export class TvScene {
  readonly canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private m: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Big screens lay out at a smaller virtual size and draw it scaled up by k. */
  private k = 1;
  private raw = { w: 0, h: 0, dpr: 1 };
  private videos = new Map<number, HTMLVideoElement>();
  private decks = new Map<number, Deck>();
  private deckAt = -1;
  private ready = false;
  private powerAt = -1;
  private now = 0;
  private last = 0;
  private opts = { reduced: false, clear: false, rogue: false };
  private menuL: Layout | null = null;
  private pageL: Layout | null = null;
  private pageLch = -1;
  private pageCh: number | null = null;
  private started = false;
  private mode: "menu" | "page" = "menu";
  private pageness = 0;
  private tr: Tr | null = null;
  private scroll = { menu: { cur: 0, target: 0 }, page: { cur: 0, target: 0 } };
  private vel = 0;
  private over = 0;
  private overAt = 0;
  private endSince = -1;
  private lastScroll = 0;
  private armed = false;
  private hoverId: string | null = null;
  private focusId: string | null = null;
  private focusVisible = false;
  fx: Fx = { power: 0, static: 0, roll: 0, split: 0, flash: 0 };
  onBack: (() => void) | null = null;

  constructor(private channels: Channel[]) {
    this.ctx = this.canvas.getContext("2d")!;
    this.m = document.createElement("canvas").getContext("2d")!;
    for (const c of channels) {
      if (c.ch === 0) continue;
      if (c.video) {
        const v = document.createElement("video");
        v.src = c.video;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = "auto";
        this.videos.set(c.ch, v);
      } else {
        const d = new Deck(channels, { videos: false });
        d.setChannel(c.ch, -10);
        this.decks.set(c.ch, d);
      }
    }
    const f = document.fonts;
    const done = () => {
      this.ready = true;
      this.menuL = null;
      this.pageL = null;
    };
    Promise.all([
      f.load(`800 100px Archivo`),
      f.load(`400 20px "Schibsted Grotesk"`),
      f.load(`600 20px "Schibsted Grotesk"`),
      f.load(`20px VT323`),
    ])
      .catch(() => undefined)
      .then(done);
    setTimeout(() => {
      if (!this.ready) done();
    }, 2500);
    this.wake();
  }

  // ---------------------------------------------------------------- control

  get curve() {
    if (this.opts.clear) return 0;
    return this.w && this.w < 700 ? 0.7 : 1;
  }

  get motion() {
    return this.opts.reduced ? 0 : 1;
  }

  get atPage() {
    return this.mode === "page";
  }

  /** Start the videos (browsers allow muted autoplay; some wait for a tap). */
  wake() {
    if (this.opts.reduced) return;
    this.videos.forEach((v) => v.play().catch(() => undefined));
  }

  setOptions(o: { reduced: boolean; clear: boolean; rogue: boolean }) {
    const was = this.opts.reduced;
    this.opts = { ...o };
    this.menuL = null;
    this.pageL = null;
    if (o.reduced && !was)
      this.videos.forEach((v) => {
        v.pause();
        v.currentTime = 1.5;
      });
    if (!o.reduced && was) this.wake();
  }

  resize(w: number, h: number, dpr: number) {
    const r = this.raw;
    if (w === r.w && h === r.h && dpr === r.dpr) return false;
    this.raw = { w, h, dpr };
    // Designed for about 1680 x 1000; anything bigger is the same picture, larger.
    this.k = clamp(Math.min(w / 1680, h / 1000), 1, 2.2);
    this.w = w / this.k;
    this.h = h / this.k;
    this.dpr = dpr * this.k;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.menuL = null;
    this.pageL = null;
    return true;
  }

  /** Go to a channel's page, or back to the menu with null. */
  go(ch: number | null) {
    const now = this.now || performance.now() / 1000;
    const red = this.opts.reduced;
    if (!this.started) {
      this.started = true;
      if (ch != null) {
        this.pageCh = ch;
        this.mode = "page";
        this.pageness = 1;
      }
      return;
    }
    if (ch == null) {
      if (this.mode === "menu") return;
      this.layouts();
      this.mode = "menu";
      this.over = 0;
      this.tr = { kind: "close", at: now, dur: red ? 0.25 : 0.72, from: this.pageness, src: this.closeSource() };
      return;
    }
    if (this.mode === "page" && this.pageCh === ch) return;
    if (this.mode === "page" && this.pageness > 0.99 && !this.tr) {
      this.tr = { kind: "switch", at: now, dur: red ? 0.2 : 0.6, from: 1, to: ch, swapped: false };
      return;
    }
    this.mode = "page";
    this.pageCh = ch;
    this.pageL = null;
    this.scroll.page = { cur: 0, target: 0 };
    this.over = 0;
    this.tr = { kind: "open", at: now, dur: red ? 0.25 : 0.82, from: this.pageness };
  }

  scrollBy(d: number, direct = false) {
    if (this.tr && this.tr.kind !== "switch") return;
    d /= this.k;
    this.vel = 0;
    const page = this.mode === "page";
    const L = page ? this.pageL : this.menuL;
    if (!L) return;
    const sc = page ? this.scroll.page : this.scroll.menu;
    const max = Math.max(0, L.height - this.h);
    const t = performance.now() / 1000;
    const gap = t - this.lastScroll;
    this.lastScroll = t;
    if (page && d > 0 && sc.target >= max - 0.5) {
      // Past the end: a new scroll after a pause at the bottom takes you back,
      // so one long fling down the page never leaves by accident.
      if (gap > 0.22) this.armed = true;
      if (this.armed) {
        this.over += d;
        this.overAt = this.now;
        if (this.over >= OVER) {
          this.over = 0;
          this.onBack?.();
        }
      }
      return;
    }
    this.armed = false;
    if (d < 0) this.over = 0;
    sc.target = clamp(sc.target + d, 0, max);
    if (direct) sc.cur = sc.target;
  }

  scrollTo(where: "top" | "end") {
    const page = this.mode === "page";
    const L = page ? this.pageL : this.menuL;
    if (!L) return;
    const sc = page ? this.scroll.page : this.scroll.menu;
    sc.target = where === "top" ? 0 : Math.max(0, L.height - this.h);
  }

  fling(v: number) {
    this.vel = clamp(v / this.k, -6000, 6000);
  }

  get viewHeight() {
    return this.h * this.k;
  }

  hitAt(x: number, y: number): Hit | null {
    x /= this.k;
    y /= this.k;
    const a = this.interactive();
    if (!a) return null;
    for (const h of a.L.hits) {
      const b = h.box;
      if (x >= b.x && x <= b.x + b.w && y >= b.y + a.dy && y <= b.y + b.h + a.dy) return h;
    }
    return null;
  }

  hover(x: number, y: number) {
    const h = this.hitAt(x, y);
    this.hoverId = h?.id ?? null;
    return h;
  }

  setFocus(id: string | null, visible: boolean) {
    this.focusId = id;
    this.focusVisible = visible;
    if (id && visible) this.reveal(id);
  }

  /** The tile next to `id` in a direction, for arrow keys on the menu. */
  neighbour(id: string | null, dir: Dir): string {
    const tiles = (this.menuL?.hits ?? []).filter((h) => h.id.startsWith("open-"));
    if (!tiles.length) return "open-1";
    const cur = tiles.find((h) => h.id === id);
    if (!cur) return tiles[0].id;
    const cx = cur.box.x + cur.box.w / 2;
    const cy = cur.box.y + cur.box.h / 2;
    let best: Hit | null = null;
    let bestD = Infinity;
    for (const h of tiles) {
      if (h === cur) continue;
      const dx = h.box.x + h.box.w / 2 - cx;
      const dy = h.box.y + h.box.h / 2 - cy;
      const along = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
      const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      if (along <= 10) continue;
      const d = along + across * 2;
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return (best ?? cur).id;
  }

  /** Stop the videos while the view is not on screen. */
  sleep() {
    this.videos.forEach((v) => v.pause());
  }

  // ------------------------------------------------------------------ frame

  draw(now: number): Frame {
    const dt = this.last ? clamp(now - this.last, 0, 0.05) : 0;
    this.last = now;
    this.now = now;
    const { ctx, w: W, h: H, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.ready || W === 0) {
      this.fx = { power: 0, static: 0, roll: 0, split: 0, flash: 0 };
      return { glass: [], dim: 0 };
    }
    if (this.powerAt < 0) this.powerAt = now;
    this.layouts();
    this.step(now, dt);
    this.tickDecks(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const glass: GlassRect[] = [];
    const e = this.pageness;
    const page = this.pageCh != null ? this.pageL : null;
    const menu = this.menuL!;
    const ms = this.scroll.menu.cur;
    const menuA = page ? 1 - smooth(0.3, 0.92, e) : 1;
    if (menuA > 0.001) {
      this.paint(menu, -ms, menuA);
      for (const g of menu.glass) glass.push({ ...g, y: g.y - ms, alpha: g.alpha * menuA });
      if (!this.tr && this.mode === "menu") this.rings(menu, -ms);
    }
    if (page && e > 0.001) {
      const ps = this.scroll.page.cur;
      const T = this.pageTransform(e);
      ctx.save();
      if (T.clip) {
        ctx.beginPath();
        ctx.roundRect(T.clip.x, T.clip.y, T.clip.w, T.clip.h, T.r);
        ctx.clip();
      }
      ctx.translate(T.ox, T.oy);
      ctx.scale(T.s, T.s);
      this.paint(page, -ps, T.alpha);
      if (!this.tr && this.mode === "page") this.rings(page, -ps);
      ctx.restore();
      const ga = T.alpha * (this.tr && this.tr.kind !== "switch" ? e * e : 1);
      for (const g of page.glass) {
        const b = { x: T.ox + g.x * T.s, y: T.oy + (g.y - ps) * T.s, w: g.w * T.s, h: g.h * T.s };
        if (T.clip && !overlaps(b, T.clip)) continue;
        glass.push({ ...g, ...b, r: g.r * T.s, bend: g.bend * T.s, alpha: g.alpha * ga });
      }
    }
    const P = this.pal;
    const k = this.k;
    const out = k === 1 ? glass : glass.map((g) => ({ ...g, x: g.x * k, y: g.y * k, w: g.w * k, h: g.h * k, r: g.r * k, bend: g.bend * k }));
    return { glass: out, dim: lerp(P.bgMenu, P.bgPage, page ? e : 0) };
  }

  // --------------------------------------------------------------- internals

  private get pal() {
    return this.opts.rogue ? ROGUE : CALM;
  }

  private channel(ch: number) {
    return this.channels.find((c) => c.ch === ch)!;
  }

  private layouts() {
    if (!this.ready || !this.w) return;
    if (!this.menuL) this.menuL = this.layoutMenu();
    if (this.pageCh != null && (!this.pageL || this.pageLch !== this.pageCh)) {
      this.pageL = this.layoutPage(this.pageCh);
      this.pageLch = this.pageCh;
    }
  }

  private interactive(): { L: Layout; dy: number } | null {
    if (this.tr && this.tr.kind !== "switch") return null;
    if (this.mode === "page" && this.pageL) return { L: this.pageL, dy: -this.scroll.page.cur };
    if (this.mode === "menu" && this.menuL) return { L: this.menuL, dy: -this.scroll.menu.cur };
    return null;
  }

  private reveal(id: string) {
    const page = this.mode === "page";
    const L = page ? this.pageL : this.menuL;
    const h = L?.hits.find((x) => x.id === id);
    if (!L || !h) return;
    const sc = page ? this.scroll.page : this.scroll.menu;
    const max = Math.max(0, L.height - this.h);
    const m = 90;
    if (h.box.y - m < sc.target) sc.target = clamp(h.box.y - m, 0, max);
    else if (h.box.y + h.box.h + m > sc.target + this.h) sc.target = clamp(h.box.y + h.box.h + m - this.h, 0, max);
  }

  private closeSource(): Box {
    const ps = this.scroll.page.cur;
    const hero = this.pageCh != null ? this.pageL?.media.get(this.pageCh) : undefined;
    if (hero && ps < this.h * 0.25) return { ...hero, y: hero.y - ps };
    return { x: 0, y: 0, w: this.w, h: this.h };
  }

  /** Where the page sits while it grows out of (or shrinks into) its tile. */
  private pageTransform(e: number) {
    const id = { s: 1, ox: 0, oy: 0, clip: null as Box | null, r: 0, alpha: 1 };
    const tr = this.tr;
    if (!tr || tr.kind === "switch" || this.pageCh == null) return id;
    if (this.opts.reduced) return { ...id, alpha: e };
    const tile = this.menuL?.media.get(this.pageCh);
    const hero = this.pageL?.media.get(this.pageCh);
    if (!tile || !hero) return { ...id, alpha: e };
    const tb = { ...tile, y: tile.y - this.scroll.menu.cur };
    const S = tr.src ?? hero;
    const s0 = Math.max(tb.w / S.w, tb.h / S.h);
    const s = Math.pow(s0, 1 - e);
    const cx = lerp(tb.x + tb.w / 2, S.x + S.w / 2, e);
    const cy = lerp(tb.y + tb.h / 2, S.y + S.h / 2, e);
    return {
      s,
      ox: cx - (S.x + S.w / 2) * s,
      oy: cy - (S.y + S.h / 2) * s,
      clip: lerpBox(tb, { x: 0, y: 0, w: this.w, h: this.h }, e),
      r: lerp(14, 0, e),
      alpha: 1,
    };
  }

  private step(now: number, dt: number) {
    const red = this.opts.reduced;
    const since = now - this.powerAt;
    const fx: Fx = { power: red ? 1 : clamp(since / 1.1, 0, 1), static: 0, roll: 0, split: 0, flash: 0 };
    if (!red) fx.static = 0.35 * (1 - smooth(0.5, 1.3, since)) * smooth(0.0, 0.3, since);
    const tr = this.tr;
    if (tr) {
      const t = clamp((now - tr.at) / tr.dur, 0, 1);
      const E = ease(t);
      if (tr.kind === "open") this.pageness = lerp(tr.from, 1, E);
      else if (tr.kind === "close") this.pageness = lerp(tr.from, 0, E);
      else if (!tr.swapped && t >= 0.45) {
        tr.swapped = true;
        this.pageCh = tr.to!;
        this.pageL = null;
        this.scroll.page = { cur: 0, target: 0 };
        this.over = 0;
        this.layouts();
        this.decks.get(tr.to!)?.retune(now);
      }
      if (!red) {
        if (tr.kind === "open") {
          fx.static += 0.5 * bell(t, 0.08, 0.06);
          fx.split = 0.006 * bell(t, 0.1, 0.12);
          fx.flash = 0.16 * bell(t, 0.02, 0.05);
          fx.roll = 0.018 * Math.sin(Math.PI * clamp(t * 1.6, 0, 1));
        } else if (tr.kind === "close") {
          fx.static += 0.45 * bell(t, 0.9, 0.06);
          fx.split = 0.006 * bell(t, 0.88, 0.12);
        } else {
          fx.static += 0.9 * bell(t, 0.45, 0.14);
          fx.roll = ease(t);
          fx.split = 0.01 * bell(t, 0.45, 0.2);
        }
      }
      if (t >= 1) {
        this.tr = null;
        if (tr.kind === "close") {
          this.pageCh = null;
          this.pageL = null;
          this.pageness = 0;
        } else this.pageness = 1;
      }
    }
    this.fx = fx;

    const page = this.mode === "page";
    const L = page ? this.pageL : this.menuL;
    const sc = page ? this.scroll.page : this.scroll.menu;
    if (L) {
      const max = Math.max(0, L.height - this.h);
      if (this.vel) {
        sc.target = clamp(sc.target + this.vel * dt, 0, max);
        sc.cur = sc.target;
        this.vel *= Math.exp(-dt * 3.2);
        if (Math.abs(this.vel) < 8 || sc.target <= 0 || sc.target >= max) this.vel = 0;
      }
      sc.target = clamp(sc.target, 0, max);
      sc.cur = red ? sc.target : lerp(sc.cur, sc.target, 1 - Math.exp(-dt * 14));
      if (Math.abs(sc.cur - sc.target) < 0.3) sc.cur = sc.target;
      if (page && sc.target >= max - 0.5) {
        if (this.endSince < 0) this.endSince = now;
      } else this.endSince = -1;
    }
    if (now - this.overAt > 0.4) this.over *= Math.exp(-dt * 5);
    if (this.over < 0.5) this.over = 0;
  }

  private tickDecks(now: number) {
    if (now - this.deckAt < 0.2) return;
    this.deckAt = now;
    this.decks.forEach((d) => d.draw(now));
  }

  // ---------------------------------------------------------------- painting

  private paint(L: Layout, dy: number, alpha: number) {
    const ctx = this.ctx;
    const H = this.h;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const it of L.items) {
      if (it.k === "text" || it.k === "clock") {
        const y = it.y + dy;
        if (y < -200 || y > H + 200) continue;
        if (it.k === "text") this.drawText(it, y);
        else this.drawClock(it.x, y, it.s, it.align);
        continue;
      }
      const b = { ...it.box, y: it.box.y + dy };
      if (b.y > H + 200 || b.y + b.h < -200) continue;
      if (it.k === "media") this.drawMedia(it.ch, b, it.r, it.fit);
      else if (it.k === "fill") {
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, it.r);
        ctx.fill();
      } else if (it.k === "scrim") {
        const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        g.addColorStop(0, it.from);
        g.addColorStop(1, it.to);
        ctx.fillStyle = g;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      } else if (it.k === "progress") {
        ctx.fillStyle = it.track;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
        ctx.fill();
        const p = clamp(this.over / OVER, 0, 1);
        if (p > 0) {
          ctx.fillStyle = it.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w * p, b.h, b.h / 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private drawText(it: TextItem, y: number) {
    const ctx = this.ctx;
    setFont(ctx, it.s);
    ctx.textAlign = it.align ?? "left";
    ctx.textBaseline = "alphabetic";
    if (it.chroma) {
      const o = Math.max(2, it.s.size * 0.025);
      ctx.fillStyle = "rgba(0,229,255,0.85)";
      ctx.fillText(it.text, it.x - o, y);
      ctx.fillStyle = "rgba(255,42,77,0.85)";
      ctx.fillText(it.text, it.x + o, y);
    }
    ctx.fillStyle = it.s.color;
    ctx.fillText(it.text, it.x, y);
  }

  private drawClock(x: number, y: number, s: Style, align: CanvasTextAlign) {
    const d = new Date();
    const t = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.  ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    this.drawText({ k: "text", x, y: 0, text: t, s, align }, y);
  }

  private source(ch: number): { img: CanvasImageSource; w: number; h: number } | null {
    const v = this.videos.get(ch);
    if (v) return v.readyState >= 2 && v.videoWidth ? { img: v, w: v.videoWidth, h: v.videoHeight } : null;
    const d = this.decks.get(ch);
    return d ? { img: d.canvas, w: DECK_W, h: DECK_H } : null;
  }

  private drawMedia(ch: number, b: Box, r: number, fit: "cover" | "contain") {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, r);
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const src = this.source(ch);
    if (src) {
      const k = fit === "cover" ? Math.max(b.w / src.w, b.h / src.h) : Math.min(b.w / src.w, b.h / src.h);
      const dw = src.w * k;
      const dh = src.h * k;
      ctx.drawImage(src.img, b.x + (b.w - dw) / 2, b.y + (b.h - dh) / 2, dw, dh);
    }
    ctx.restore();
  }

  private rings(L: Layout, dy: number) {
    const ctx = this.ctx;
    const P = this.pal;
    for (const h of L.hits) {
      const focus = this.focusVisible && h.id === this.focusId;
      const hover = h.id === this.hoverId;
      if (!focus && !hover) continue;
      const b = h.box;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(b.x - 4, b.y + dy - 4, b.w + 8, b.h + 8, h.r + 4);
      ctx.lineWidth = focus ? 3 : 1.5;
      ctx.strokeStyle = focus ? P.accent : P.ring;
      ctx.stroke();
      ctx.restore();
      if (h.hint) {
        const s = { family: MONO, weight: 400, size: 21, lh: 1, color: P.accent, track: 1 };
        this.drawText({ k: "text", x: h.hint.x, y: 0, text: "OPEN", s, align: "right" }, h.hint.y + dy);
      }
    }
  }

  // ----------------------------------------------------------------- layout

  private st(family: string, weight: number, size: number, color: string, extra: Partial<Style> = {}): Style {
    return { family, weight, size, lh: 1.3, color, ...extra };
  }

  private measure(text: string, s: Style) {
    setFont(this.m, s);
    return this.m.measureText(text).width;
  }

  private wrap(text: string, s: Style, maxW: number) {
    setFont(this.m, s);
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (line && this.m.measureText(t).width > maxW) {
        lines.push(line);
        line = word;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Shorten a line with an ellipsis so it fits. */
  private fit(text: string, s: Style, maxW: number) {
    if (this.measure(text, s) <= maxW) return text;
    let t = text;
    while (t.length > 1 && this.measure(`${t}…`, s) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }

  private text(L: Layout, x: number, y: number, text: string, s: Style, align?: CanvasTextAlign, chroma = false) {
    L.items.push({ k: "text", x, y, text, s, align, chroma });
  }

  /** A wrapped paragraph. `top` is the top of the block; returns its bottom. */
  private para(L: Layout, x: number, top: number, maxW: number, text: string, s: Style, align: CanvasTextAlign = "left") {
    const lines = this.wrap(text, s, maxW);
    const lh = s.size * s.lh;
    const ax = align === "center" ? x + maxW / 2 : align === "right" ? x + maxW : x;
    lines.forEach((t, i) => this.text(L, ax, top + i * lh + (lh - s.size) / 2 + s.size * 0.8, t, s, align));
    return top + lines.length * lh;
  }

  private glassBox(L: Layout, box: Box, r: number, bend: number, frost: number) {
    const P = this.pal;
    L.glass.push({ ...box, r, tint: P.tint, tintAmt: P.tintAmt, bend, frost, alpha: 1 });
  }

  /** A pill button. "glass" bends the signal; "solid" sits on video or black. */
  private pill(L: Layout, x: number, y: number, label: string, s: Style, id: string | null, action: Action | null, kind: "glass" | "solid" | "accent", h = 40, padX = 18) {
    const w = Math.ceil(this.measure(label, s) + padX * 2);
    const box = { x, y, w, h };
    if (kind === "glass") this.glassBox(L, box, h / 2, 8, 8);
    else if (kind === "accent") {
      L.items.push({ k: "fill", box: { ...box }, r: h / 2, color: this.pal.accent });
      s = { ...s, color: "#141210" };
    } else {
      L.items.push({ k: "fill", box: { ...box }, r: h / 2, color: "rgba(255,255,255,0.18)" });
      L.items.push({ k: "fill", box: { x: x + 1, y: y + 1, w: w - 2, h: h - 2 }, r: h / 2 - 1, color: "rgba(10,10,14,0.78)" });
    }
    this.text(L, x + w / 2, y + h / 2 + s.size * 0.35, label, s, "center");
    if (id && action) L.hits.push({ id, box: { ...box }, r: h / 2, action });
    return w;
  }

  private intro(L: Layout, x: number, y: number, w: number, narrow: boolean, compact: boolean) {
    const P = this.pal;
    const y0 = y;
    const eb = this.st(MONO, 400, narrow ? 19 : 22, P.faint, { track: 2 });
    this.text(L, x, y + eb.size * 0.8, person.place.toUpperCase(), eb);
    y += eb.size + (narrow ? 10 : 16);
    const nm: Style = { family: DISPLAY, weight: 800, size: 100, lh: 0.9, color: P.ink, stretch: "extra-condensed" };
    const size = Math.min(narrow ? 96 : 136, this.h * 0.2, (w / this.measure("HARSHAVARDHAN", nm)) * 100 * 0.99);
    const ns = { ...nm, size, color: this.opts.rogue ? P.accent : P.ink };
    ["SAI", "HARSHAVARDHAN"].forEach((t, i) =>
      this.text(L, x - size * 0.02, y + size * 0.8 + i * size * 0.9, t, ns, "left", this.opts.rogue),
    );
    y += size * 1.8 + (narrow ? 16 : 26);
    const lede = this.st(BODY, 400, narrow ? 17 : clamp(this.w * 0.0125, 17, 21), P.body, { lh: 1.45 });
    y = this.para(L, x, y, w * 0.96, person.lede, lede);
    y += narrow ? 20 : 28;
    if (!compact) {
      const nowL = this.st(MONO, 400, 21, P.osd, { track: 1 });
      L.items.push({ k: "fill", box: { x, y: y + 5, w: 9, h: 9 }, r: 4.5, color: P.osd });
      this.text(L, x + 18, y + 15, "NOW", nowL);
      y += 24;
      y = this.para(L, x, y, w, person.now, this.st(BODY, 400, 15.5, P.dim, { lh: 1.4 }));
      y += narrow ? 20 : 28;
    }
    const ps = this.st(BODY, 600, 15, P.ink);
    const links: [string, string, string][] = [
      ["link-github", "GitHub ↗", person.github],
      ["link-hf", "Hugging Face ↗", person.huggingface],
      ["link-linkedin", "LinkedIn ↗", person.linkedin],
    ];
    let px = x;
    links.unshift(["book", `${cta.label} ↗`, cta.href]);
    for (const [id, label, href] of links) {
      const lw = Math.ceil(this.measure(label, ps) + 36);
      if (px > x && px + lw > x + w) {
        px = x;
        y += 50;
      }
      px += this.pill(L, px, y, label, ps, id, { t: "link", href }, id === "book" ? "accent" : "glass") + 10;
    }
    y += 40;
    return y - y0;
  }

  private tile(L: Layout, ch: number, x: number, y: number, w: number, h: number, tp: number, lab: number) {
    const c = this.channel(ch);
    const P = this.pal;
    const box = { x, y, w, h };
    const small = w < 250;
    this.glassBox(L, box, small ? 18 : 22, small ? 14 : 18, 12);
    const mb = { x: x + tp, y: y + tp, w: w - 2 * tp, h: h - 2 * tp - lab };
    L.items.push({ k: "media", ch, box: { ...mb }, r: small ? 11 : 14, fit: c.video ? "cover" : "contain" });
    L.media.set(ch, { ...mb });
    const ly = mb.y + mb.h;
    const num = this.st(MONO, 400, small ? 21 : 25, P.accent);
    const tl = this.st(BODY, 600, small ? 15 : 17.5, P.ink);
    const kd = this.st(BODY, 400, small ? 12.5 : 14, P.dim);
    const lx = x + tp + 4;
    const tx = lx + (small ? 27 : 34);
    const t1 = small ? 26 : 30;
    const t2 = small ? 44 : 49;
    this.text(L, lx, ly + t1 + 1, pad2(ch), num);
    this.text(L, tx, ly + t1, this.fit(c.title, tl, x + w - tp - 4 - tx), tl);
    this.text(L, tx, ly + t2, this.fit(c.tile ?? c.kind.split(" · ")[0], kd, x + w - tp - (small ? 46 : 56) - tx), kd);
    L.hits.push({
      id: `open-${ch}`,
      box: { ...box },
      r: small ? 18 : 22,
      action: { t: "open", ch },
      hint: { x: x + w - tp - 4, y: ly + t2 + 1 },
    });
  }

  private toggles(L: Layout, x: number, y: number, rightAlign: boolean) {
    const s = this.st(MONO, 400, 20, this.pal.ink, { track: 1 });
    const items: [string, string, "clear" | "rogue"][] = [
      ["toggle-clear", this.opts.clear ? "PICTURE: CLEAR" : "PICTURE: CRT", "clear"],
      ["toggle-rogue", this.opts.rogue ? "ROGUE MODE: ON" : "ROGUE MODE: OFF", "rogue"],
    ];
    const widths = items.map(([, label]) => Math.ceil(this.measure(label, s) + 36));
    let px = rightAlign ? x - widths.reduce((a, b) => a + b, 0) - 10 : x;
    items.forEach(([id, label, which], i) => {
      this.pill(L, px, y, label, s, id, { t: "toggle", which }, "glass");
      px += widths[i] + 10;
    });
  }

  /** A small guide entry: a live thumbnail of the channel beside its name. */
  private mini(L: Layout, ch: number, x: number, y: number, w: number, h: number) {
    const c = this.channel(ch);
    const P = this.pal;
    const box = { x, y, w, h };
    this.glassBox(L, box, 16, 12, 10);
    const tp = 9;
    const th = h - 2 * tp;
    const mb = { x: x + tp, y: y + tp, w: th * (4 / 3), h: th };
    L.items.push({ k: "media", ch, box: { ...mb }, r: 8, fit: "contain" });
    L.media.set(ch, { ...mb });
    const tx = mb.x + mb.w + 11;
    const room = x + w - 10 - tx;
    const tight = room < 130;
    const tl = this.st(BODY, 600, tight ? 14 : 15, P.ink);
    const num = this.st(MONO, 400, tight ? 18 : 19, P.accent);
    const kd = this.st(BODY, 400, tight ? 12 : 12.5, P.dim);
    const mid = y + h / 2;
    this.text(L, tx, mid - 4, this.fit(c.title, tl, room), tl);
    this.text(L, tx, mid + 15, pad2(ch), num);
    const kx = tx + this.measure("00", num) + 7;
    this.text(L, kx, mid + 14, this.fit(c.tile ?? c.kind.split(" · ")[0], kd, x + w - 10 - kx), kd);
    L.hits.push({ id: `open-${ch}`, box: { ...box }, r: 16, action: { t: "open", ch } });
  }

  /** Channels 6 to 9 are about me rather than a product: a 2-column guide. */
  private guide(L: Layout, x: number, y: number, w: number, cols: number) {
    const lab = this.st(MONO, 400, 20, this.pal.faint, { track: 2 });
    this.text(L, x, y + lab.size * 0.8, "MORE ABOUT ME", lab);
    y += lab.size + 12;
    const gap = 10;
    const mw = (w - gap * (cols - 1)) / cols;
    const mh = 60;
    [6, 7, 8, 9].forEach((ch, i) =>
      this.mini(L, ch, x + (i % cols) * (mw + gap), y + Math.floor(i / cols) * (mh + gap), mw, mh),
    );
    return lab.size + 12 + Math.ceil(4 / cols) * (mh + gap) - gap;
  }

  private layoutMenu(): Layout {
    const W = this.w;
    const H = this.h;
    const P = this.pal;
    const L = blank();
    const wide = W >= 1260 && H >= 560;
    const pad = wide ? clamp(W * 0.045, 40, 84) : clamp(W * 0.055, 18, 30);
    const osd = this.st(MONO, 400, wide ? 30 : 25, P.osd);
    const osdY = (wide ? pad * 0.5 : 20) + osd.size * 0.8;
    this.text(L, pad, osdY, "CH 00", osd);
    this.text(L, pad + this.measure("CH 00", osd) + 14, osdY, "MENU", { ...osd, color: P.ink });
    L.items.push({ k: "clock", x: W - pad, y: osdY, s: { ...osd, size: osd.size * 0.82, color: P.ink }, align: "right" });
    const hint = "ARROWS CHOOSE   ENTER OPENS   0-9 CHANGE CHANNEL";

    if (wide) {
      const colW = clamp(W * 0.31, 340, 540);
      const top = osdY + 40;
      const bottom = H - pad * 0.5 - 64;
      // Left: who I am, then the guide to the channels about me.
      // On short screens the NOW line goes; channel 6 says the same.
      const room = bottom - top;
      const gh = 20 + 20 + 12 + 2 * 60 + 10;
      const compact = this.intro(blank(), pad, 0, colW, false, false) + 34 + gh > room;
      const col = blank();
      let cy = this.intro(col, pad, 0, colW, false, compact) + (compact ? 22 : 34);
      cy += this.guide(col, pad, cy, colW, 2);
      shift(col, top + Math.max(0, (room - cy) / 2));
      merge(L, col);

      // Right: the products, big and live.
      const rows = [
        { chs: [1, 2], a: 16 / 9 },
        { chs: [3, 4, 5], a: 4 / 3 },
      ];
      const gx = pad + colW + clamp(W * 0.04, 32, 72);
      const areaW = W - pad - gx;
      const gap = clamp(W * 0.014, 14, 26);
      const tw = (n: number, w: number) => (w - gap * (n - 1)) / n;
      const geom = (n: number, w: number) => (tw(n, w) < 250 ? { tp: 8, lab: 54 } : { tp: 10, lab: 62 });
      const rowH = (n: number, a: number, w: number) => {
        const g = geom(n, w);
        return (tw(n, w) - 2 * g.tp) / a + 2 * g.tp + g.lab;
      };
      const total = (w: number) => rows.reduce((sum, r) => sum + rowH(r.chs.length, r.a, w), 0) + gap * (rows.length - 1);
      let gw = areaW;
      while (total(gw) > room && gw > 320) gw *= 0.97;
      const x0 = gx + (areaW - gw) / 2;
      let y = top + Math.max(0, (room - total(gw)) / 2);
      for (const r of rows) {
        const n = r.chs.length;
        const t = tw(n, gw);
        const g = geom(n, gw);
        const th = rowH(n, r.a, gw);
        r.chs.forEach((ch, i) => this.tile(L, ch, x0 + i * (t + gap), y, t, th, g.tp, g.lab));
        y += th + gap;
      }
      const barY = Math.max(H - pad * 0.5 - 40, y + 10, top + cy + 16);
      this.text(L, pad, barY + 27, hint, this.st(MONO, 400, 21, P.faint, { track: 1 }));
      this.toggles(L, W - pad, barY, true);
      L.height = Math.max(H, barY + 40 + pad * 0.5);
      return L;
    }

    let y = osdY + 30;
    const w = W - 2 * pad;
    y += this.intro(L, pad, y, w, true, false) + 34;
    const cols = W >= 640 ? 2 : 1;
    const gap = 14;
    const tw = (w - gap * (cols - 1)) / cols;
    const tp = 8;
    const lab = 62;
    const th = (tw - 2 * tp) / (16 / 10) + 2 * tp + lab;
    const all = [1, 2, 3, 4, 5];
    all.forEach((ch, i) =>
      this.tile(L, ch, pad + (i % cols) * (tw + gap), y + Math.floor(i / cols) * (th + gap), tw, th, tp, lab),
    );
    y += Math.ceil(all.length / cols) * (th + gap) + 18;
    y += this.guide(L, pad, y, w, cols) + 30;
    this.toggles(L, pad, y, false);
    L.height = y + 40 + pad + 24;
    return L;
  }

  private layoutPage(ch: number): Layout {
    const W = this.w;
    const H = this.h;
    const P = this.pal;
    const L = blank();
    const c = this.channel(ch);
    const pg = pages[ch];
    const narrow = W < 980;
    const pad = narrow ? clamp(W * 0.055, 18, 30) : clamp(W * 0.045, 40, 84);

    // Hero: the channel fills the screen.
    L.items.push({ k: "fill", box: { x: 0, y: 0, w: W, h: H }, r: 0, color: "#000" });
    const a = c.video ? 16 / 9 : 4 / 3;
    // Phones on their side: picture on the left, title beside it.
    const side = narrow && H < 520 && W > H * 1.3;
    const band = narrow ? 240 : 214;
    const heroTop = side ? 64 : narrow ? 72 : 82;
    let mh = side ? H - heroTop - 44 : H - band - heroTop;
    let mw = mh * a;
    const maxW = side ? W * 0.58 - pad : narrow ? W : W - 2 * pad;
    if (mw > maxW) {
      mw = maxW;
      mh = mw / a;
    }
    const my = side
      ? heroTop + (H - heroTop - 44 - mh) / 2
      : narrow
        ? Math.max(heroTop, (H - mh - band) / 2)
        : heroTop + (H - band - heroTop - mh) / 2;
    const mb = { x: side ? pad : (W - mw) / 2, y: my, w: mw, h: mh };
    L.items.push({ k: "media", ch, box: { ...mb }, r: 0, fit: "contain" });
    L.media.set(ch, { ...mb });

    const kick = this.st(MONO, 400, narrow ? 21 : 25, P.accent, { track: 1 });
    const sideX = mb.x + mb.w + 26;
    const sideW = W - sideX - pad;
    const tsize = side ? clamp(sideW * 0.15, 30, 46) : narrow ? clamp(W * 0.12, 36, 60) : clamp(W * 0.05, 52, 92);
    const title: Style = { family: DISPLAY, weight: 800, size: tsize, lh: 0.95, color: P.ink, stretch: "extra-condensed" };
    const kind = this.st(BODY, 500, narrow ? 15.5 : 18, P.dim);
    const tLines = this.wrap(c.title, title, side ? sideW : narrow ? W - 2 * pad : Math.min(W * 0.6, 900));
    const tx = side ? sideX : narrow ? pad : mb.x;
    const kindLines = side ? this.wrap(c.kind, kind, sideW) : narrow ? this.wrap(c.kind, kind, W - 2 * pad) : [];
    let ty = side
      ? mb.y + Math.max(0, (mb.h - (kick.size + 10 + tLines.length * tsize * 0.95 + 14 + kindLines.length * kind.size * 1.35)) / 2)
      : mb.y + mb.h + (narrow ? 24 : 30);
    this.text(L, tx, ty + kick.size * 0.8, `CH ${pad2(ch)} · P${c.page}`, kick);
    ty += kick.size + 10;
    tLines.forEach((t, i) => this.text(L, tx - tsize * 0.02, ty + tsize * 0.8 + i * tsize * 0.95, t, title));
    ty += tLines.length * tsize * 0.95 + 14;
    if (narrow) kindLines.forEach((t, i) => this.text(L, tx, ty + kind.size + i * kind.size * 1.35, t, kind));
    else this.text(L, tx, ty + kind.size, this.fit(c.kind, kind, W - tx - pad), kind);
    const sh = this.st(MONO, 400, 21, P.faint, { track: 1 });
    if (side) this.text(L, W - pad, H - 18, "SCROLL FOR THE STORY", sh, "right");
    else if (narrow) this.text(L, W / 2, H - 24, "SCROLL FOR THE STORY", sh, "center");
    else this.text(L, W - pad, H - pad - 4, "SCROLL FOR THE STORY", sh, "right");

    const topY = narrow ? 16 : pad * 0.55;
    const topS = this.st(BODY, 600, 15, "#ffffff");
    const menuW = this.pill(L, pad * 0.8, topY, "← Menu", topS, "back", { t: "back" }, "solid");
    const bookL = `${cta.label} ↗`;
    // Phones: the button takes the clock's place on the right.
    const bookX = narrow ? W - pad * 0.8 - Math.ceil(this.measure(bookL, topS) + 36) : pad * 0.8 + menuW + 10;
    this.pill(L, bookX, topY, bookL, topS, "book", { t: "link", href: cta.href }, "accent");
    if (!narrow) L.items.push({ k: "clock", x: W - pad * 0.8, y: topY + 27, s: this.st(MONO, 400, 26, P.ink), align: "right" });

    // The story, on the dimmed signal.
    L.items.push({ k: "scrim", box: { x: 0, y: H, w: W, h: 240 }, from: "rgba(0,0,0,1)", to: "rgba(0,0,0,0)" });
    let y = H + (narrow ? 72 : 130);
    const cw = Math.min(860, W - 2 * pad);
    const cx = (W - cw) / 2;
    const h2 = this.st(MONO, 400, narrow ? 22 : 25, P.cyan, { track: 2 });
    const heading = (t: string) => {
      this.text(L, cx, y + h2.size * 0.8, t, h2);
      y += h2.size + 16;
    };
    const SECTION = narrow ? 52 : 70;
    const bodyS = this.st(BODY, 400, narrow ? 17.5 : 21, P.body, { lh: 1.55 });
    const listS = this.st(BODY, 400, narrow ? 16.5 : 18.5, P.body, { lh: 1.5 });
    const dimS = this.st(BODY, 400, narrow ? 15 : 16, P.dim, { lh: 1.5 });
    const strong = this.st(BODY, 600, narrow ? 17 : 19, P.ink, { lh: 1.35 });
    const metaS = this.st(MONO, 400, narrow ? 19 : 21, P.accent, { track: 1 });

    for (const b of pg.blocks) {
      switch (b.t) {
        case "text": {
          heading(b.heading);
          const paras = Array.isArray(b.body) ? b.body : [b.body];
          paras.forEach((t, i) => {
            if (i) y += bodyS.size * 0.7;
            y = this.para(L, cx, y, cw, t, bodyS);
          });
          break;
        }
        case "numbers": {
          const ncol = narrow ? 1 : b.items.length;
          const cg = 16;
          const cwid = (cw - cg * (ncol - 1)) / ncol;
          const val: Style = { family: DISPLAY, weight: 800, size: narrow ? 48 : 60, lh: 1, color: P.accent, stretch: "extra-condensed" };
          const lbl = this.st(BODY, 400, 14.5, P.dim, { lh: 1.4 });
          const vs = (v: string) => ({ ...val, size: Math.min(val.size, ((cwid - 44) / this.measure(v, val)) * val.size) });
          const cardH = (n: { label: string }) => 26 + val.size * 0.82 + 14 + this.wrap(n.label, lbl, cwid - 44).length * lbl.size * lbl.lh + 22;
          for (let i = 0; i < b.items.length; i += ncol) {
            const row = b.items.slice(i, i + ncol);
            const rh = Math.max(...row.map(cardH));
            row.forEach((n, j) => {
              const x = cx + j * (cwid + cg);
              this.glassBox(L, { x, y, w: cwid, h: rh }, 20, 16, 12);
              this.text(L, x + 22, y + 26 + val.size * 0.82, n.value, vs(n.value));
              this.para(L, x + 22, y + 26 + val.size * 0.82 + 14, cwid - 44, n.label, lbl);
            });
            y += rh + cg;
          }
          y -= cg;
          break;
        }
        case "bullets": {
          heading(b.heading);
          b.items.forEach((t, i) => {
            if (i) y += 12;
            const lh = listS.size * listS.lh;
            L.items.push({ k: "fill", box: { x: cx + 2, y: y + lh / 2 - 3.5, w: 7, h: 7 }, r: 1.5, color: P.accent });
            y = this.para(L, cx + 24, y, cw - 24, t, listS);
          });
          break;
        }
        case "steps": {
          heading(b.heading);
          const numS: Style = { family: DISPLAY, weight: 800, size: narrow ? 40 : 52, lh: 1, color: P.accent, stretch: "extra-condensed" };
          const ind = narrow ? 44 : 64;
          b.items.forEach((st, i) => {
            if (i) {
              L.items.push({ k: "fill", box: { x: cx + ind, y: y + 13, w: cw - ind, h: 1 }, r: 0, color: "rgba(255,255,255,0.12)" });
              y += 28;
            }
            this.text(L, cx, y + numS.size * 0.78, String(i + 1), numS);
            y = this.para(L, cx + ind, y, cw - ind, st.title, strong) + 4;
            y = this.para(L, cx + ind, y, cw - ind, st.body, listS);
          });
          break;
        }
        case "timeline": {
          heading(b.heading);
          const whenW = narrow ? 0 : 200;
          b.items.forEach((e, i) => {
            if (i) {
              L.items.push({ k: "fill", box: { x: cx, y: y + 15, w: cw, h: 1 }, r: 0, color: "rgba(255,255,255,0.12)" });
              y += 32;
            }
            const x = cx + whenW;
            const w = cw - whenW;
            if (narrow) {
              this.text(L, cx, y + metaS.size * 0.8, e.when.toUpperCase(), metaS);
              y += metaS.size + 8;
            } else this.text(L, cx, y + metaS.size * 0.8 + 1, e.when.toUpperCase(), metaS);
            y = this.para(L, x, y, w, e.title, strong) + 2;
            y = this.para(L, x, y, w, e.where, dimS);
            if (e.body) y = this.para(L, x, y + 8, w, e.body, listS);
          });
          break;
        }
        case "list": {
          heading(b.heading);
          const rp = narrow ? 18 : 22;
          const titleS = this.st(BODY, 600, narrow ? 17 : 18.5, P.ink, { lh: 1.35 });
          const subS = this.st(BODY, 400, narrow ? 14.5 : 15.5, P.dim, { lh: 1.45 });
          const tagS = this.st(MONO, 400, narrow ? 18 : 20, P.cyan, { track: 1 });
          b.items.forEach((r) => {
            const tag = (r.meta ?? "").toUpperCase();
            const tagW = narrow || !tag ? 0 : Math.ceil(this.measure(tag, tagS)) + 20;
            const inner = cw - 2 * rp;
            const tl = this.wrap(`${r.title} ↗`, titleS, inner - tagW);
            const sl = this.wrap(r.sub, subS, inner);
            const tagH = narrow && tag ? tagS.size + 6 : 0;
            const rh = rp + tagH + tl.length * titleS.size * titleS.lh + 4 + sl.length * subS.size * subS.lh + rp - 4;
            const box = { x: cx, y, w: cw, h: rh };
            this.glassBox(L, box, 18, 12, 10);
            let ry = y + rp - 4;
            if (narrow && tag) {
              this.text(L, cx + rp, ry + tagS.size * 0.8, tag, tagS);
              ry += tagH;
            } else if (tag) this.text(L, cx + cw - rp, ry + tagS.size * 0.8 + 3, tag, tagS, "right");
            ry = this.para(L, cx + rp, ry, inner - tagW, `${r.title} ↗`, titleS) + 4;
            this.para(L, cx + rp, ry, inner, r.sub, subS);
            L.hits.push({ id: r.id!, box: { ...box }, r: 18, action: { t: "link", href: r.href } });
            y += rh + 12;
          });
          y -= 12;
          break;
        }
        case "chips": {
          heading(b.heading);
          const chip = this.st(BODY, 600, 14.5, P.ink);
          let px = cx;
          for (const t of b.items) {
            const w = Math.ceil(this.measure(t, chip) + 32);
            if (px > cx && px + w > cx + cw) {
              px = cx;
              y += 46;
            }
            this.pill(L, px, y, t, chip, null, null, "glass", 36, 16);
            px += w + 10;
          }
          y += 36;
          break;
        }
        case "note": {
          const y1 = y;
          y = this.para(L, cx + 18, y, cw - 18, b.body, this.st(BODY, 400, 15.5, P.dim, { lh: 1.5 }));
          L.items.push({ k: "fill", box: { x: cx, y: y1 + 3, w: 3, h: y - y1 - 6 }, r: 1.5, color: P.accent });
          break;
        }
        case "tree": {
          heading(b.heading);
          const T = blank();
          const ip = narrow ? 18 : 28;
          const mono = this.st(MONO, 400, narrow ? 19 : 22, P.ink);
          const faintMono = { ...mono, color: P.dim };
          const noteS = this.st(BODY, 400, narrow ? 13.5 : 14.5, P.dim, { lh: 1.4 });
          const lh = Math.round(mono.size * 1.25);
          const wire = "rgba(255,255,255,0.24)";
          const line = (x: number, y0: number, w: number, h: number) =>
            T.items.push({ k: "fill", box: { x, y: y0, w, h }, r: 0, color: wire });
          const x0 = cx + ip;
          const right = cx + cw - ip;
          const gx = x0 + 28; // group names
          const ix = x0 + 60; // items
          let ty = y + ip - 6;
          this.text(T, x0, ty + mono.size * 0.8, b.root, { ...mono, color: P.osd });
          ty += lh;
          const trunkTop = ty - 4;
          let trunkEnd = ty;
          for (const g of b.groups) {
            const mid = ty + lh / 2 - 2;
            line(x0 + 6, mid, 16, 1.5);
            trunkEnd = mid;
            this.text(T, gx, ty + mono.size * 0.8, g.path, { ...mono, color: P.accent });
            if (g.note) {
              const pw = this.measure(g.path, mono);
              if (!narrow) this.text(T, gx + pw + 16, ty + mono.size * 0.8, this.fit(g.note, noteS, right - gx - pw - 16), noteS);
              else {
                ty += lh;
                this.text(T, gx, ty + noteS.size * 0.9, this.fit(g.note, noteS, right - gx), noteS);
              }
            }
            ty += lh + 2;
            const stemTop = ty - 6;
            let stemEnd = ty;
            if (g.items.some((it) => it.note)) {
              const nameW = Math.max(...g.items.map((it) => this.measure(it.name, mono)));
              const beside = !narrow && right - (ix + nameW + 22) > 260;
              for (const it of g.items) {
                const m = ty + lh / 2 - 2;
                line(x0 + 34, m, 18, 1.5);
                stemEnd = m;
                this.text(T, ix, ty + mono.size * 0.8, it.name, mono);
                if (it.note) {
                  if (beside) {
                    const nx = ix + nameW + 22;
                    const end = this.para(T, nx, ty + (lh - noteS.size * noteS.lh) / 2, right - nx, it.note, noteS);
                    ty = Math.max(ty + lh, end + 2);
                  } else {
                    ty = this.para(T, ix, ty + lh - 2, right - ix, it.note, noteS) + 8;
                  }
                } else ty += lh;
              }
            } else {
              // Short names flow as a wrapped list on one branch.
              const m = ty + lh / 2 - 2;
              line(x0 + 34, m, 18, 1.5);
              stemEnd = m;
              let px = ix;
              const dot = "  ·  ";
              const dw = this.measure(dot, mono);
              g.items.forEach((it, i) => {
                const w = this.measure(it.name, mono);
                if (px > ix && px + dw + w > right) {
                  px = ix;
                  ty += lh;
                } else if (px > ix) {
                  this.text(T, px, ty + mono.size * 0.8, dot, faintMono);
                  px += dw;
                }
                this.text(T, px, ty + mono.size * 0.8, it.name, i % 2 ? mono : { ...mono, color: "#e6dfd2" });
                px += w;
              });
              ty += lh;
            }
            line(x0 + 34, stemTop, 1.5, stemEnd - stemTop + 1);
            ty += 10;
          }
          line(x0 + 6, trunkTop, 1.5, trunkEnd - trunkTop + 1);
          const h = ty - y + ip - 14;
          this.glassBox(L, { x: cx, y, w: cw, h }, 22, 14, 12);
          merge(L, T);
          y += h;
          break;
        }
        case "links": {
          const ls = this.st(BODY, 600, 16, P.ink);
          let px = cx;
          b.items.forEach((l) => {
            const label = `${l.label} ↗`;
            const w = Math.ceil(this.measure(label, ls) + 44);
            if (px > cx && px + w > cx + cw) {
              px = cx;
              y += 58;
            }
            this.pill(L, px, y, label, ls, l.id!, { t: "link", href: l.href }, "glass", 46, 22);
            px += w + 12;
          });
          y += 46;
          break;
        }
      }
      y += SECTION;
    }

    // The end: keep scrolling and the page goes back into the TV.
    const ls = this.st(BODY, 600, 16, P.ink);
    y += narrow ? 70 : 120;
    const pw = Math.min(340, cw);
    L.items.push({ k: "progress", box: { x: (W - pw) / 2, y, w: pw, h: 4 }, color: P.accent, track: "rgba(255,255,255,0.16)" });
    y += 26;
    const ew = Math.min(cw, 560);
    y = this.para(L, (W - ew) / 2, y, ew, "KEEP SCROLLING TO GO BACK TO THE MENU", this.st(MONO, 400, narrow ? 20 : 23, P.faint, { track: 1, lh: 1.25 }), "center");
    y += 22;
    const bw = Math.ceil(this.measure("← Back to the menu", ls) + 44);
    this.pill(L, (W - bw) / 2, y, "← Back to the menu", ls, "back-end", { t: "back" }, "glass", 46, 22);
    y += 46 + 34;
    this.text(L, W / 2, y + 18, "LIKE WHAT YOU SEE?", this.st(MONO, 400, narrow ? 20 : 23, P.accent, { track: 1 }), "center");
    y += 36;
    const cl = `${cta.long} ↗`;
    const cw2 = Math.ceil(this.measure(cl, ls) + 44);
    this.pill(L, (W - cw2) / 2, y, cl, ls, "book-end", { t: "link", href: cta.href }, "accent", 46, 22);
    y += 46;
    L.height = y + Math.max(170, H * 0.32);
    return L;
  }
}
