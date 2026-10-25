// The "broadcast deck": draws whatever is on the current channel into one 4:3
// canvas that the TV screen samples as a texture. Video channels show the
// product promos letterboxed with an on-screen display; the other channels are
// German-style Videotext (teletext) pages, 40 columns by 25 rows.

import type { Channel } from "../content";

export const DECK_W = 960;
export const DECK_H = 720;
const COLS = 40;
const ROWS = 25;
const CW = DECK_W / COLS; // 24
const CH = DECK_H / ROWS; // 28.8

export const TT = {
  r: "#ff3030",
  g: "#30ff50",
  y: "#ffee30",
  b: "#2a3cff",
  m: "#ff30ee",
  c: "#30f4ff",
  w: "#f2f2f2",
  k: "#000000",
} as const;
type TTKey = keyof typeof TT;

/** Banner colour and mosaic title for each teletext page. */
const BANNER: Record<number, { bg: TTKey; fg: TTKey; text: string }> = {
  0: { bg: "b", fg: "y", text: "HARSHA" },
  3: { bg: "r", fg: "w", text: "ZUNZUN" },
  4: { bg: "m", fg: "w", text: "ROCMFPX" },
  5: { bg: "g", fg: "k", text: "MARL" },
  6: { bg: "c", fg: "k", text: "IIKT" },
  7: { bg: "y", fg: "k", text: "AGENTS" },
  8: { bg: "b", fg: "w", text: "ABOUT" },
  9: { bg: "w", fg: "k", text: "ALL WORK" },
};

// A 4 x 5 pixel font for the mosaic banners. Each glyph is 5 rows of 4 bits.
const FONT: Record<string, string[]> = {
  A: [".##.", "#..#", "####", "#..#", "#..#"],
  B: ["###.", "#..#", "###.", "#..#", "###."],
  C: [".###", "#...", "#...", "#...", ".###"],
  D: ["###.", "#..#", "#..#", "#..#", "###."],
  E: ["####", "#...", "###.", "#...", "####"],
  F: ["####", "#...", "###.", "#...", "#..."],
  G: [".###", "#...", "#.##", "#..#", ".###"],
  H: ["#..#", "#..#", "####", "#..#", "#..#"],
  I: ["####", ".##.", ".##.", ".##.", "####"],
  K: ["#..#", "#.#.", "##..", "#.#.", "#..#"],
  L: ["#...", "#...", "#...", "#...", "####"],
  M: ["#..#", "####", "####", "#..#", "#..#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###.", "#..#", "###.", "#...", "#..."],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  T: ["####", ".##.", ".##.", ".##.", ".##."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  W: ["#..#", "#..#", "####", "####", "#..#"],
  X: ["#..#", "#..#", ".##.", "#..#", "#..#"],
  Z: ["####", "...#", ".##.", "#...", "####"],
  " ": ["....", "....", "....", "....", "...."],
};

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Split "{y}1{w} Nimbus" into coloured runs. */
function runs(line: string, start: TTKey = "w") {
  const out: { color: TTKey; text: string }[] = [];
  let color: TTKey = start;
  const re = /\{([rgybmcwk])\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ color, text: line.slice(last, m.index) });
    color = m[1] as TTKey;
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ color, text: line.slice(last) });
  return out;
}

export class Deck {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videos = new Map<number, HTMLVideoElement>();
  private current: Channel;
  private switchedAt = 0;
  private fontScale = 1;
  private probe: CanvasRenderingContext2D;
  private avg: [number, number, number] = [80, 120, 255];
  private frame = 0;

  constructor(
    private channels: Channel[],
    opts: { videos?: boolean } = {},
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = DECK_W;
    this.canvas.height = DECK_H;
    this.ctx = this.canvas.getContext("2d")!;
    const p = document.createElement("canvas");
    p.width = 8;
    p.height = 6;
    this.probe = p.getContext("2d", { willReadFrequently: true })!;
    this.current = channels[0];
    for (const c of channels) {
      if (!c.video || opts.videos === false) continue;
      const v = document.createElement("video");
      v.src = c.video;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "metadata";
      this.videos.set(c.ch, v);
    }
    this.measureFont();
    document.fonts?.load(`${CH}px VT323`).then(() => this.measureFont());
  }

  private measureFont() {
    const ctx = this.ctx;
    ctx.font = `${CH * 1.12}px VT323, monospace`;
    const adv = ctx.measureText("M").width || CW;
    this.fontScale = CW / adv;
  }

  get channel() {
    return this.current;
  }

  setChannel(ch: number, now: number) {
    const next = this.channels.find((c) => c.ch === ch);
    if (!next || next === this.current) return;
    this.videos.get(this.current.ch)?.pause();
    this.current = next;
    this.switchedAt = now;
    const v = this.videos.get(ch);
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  }

  /** Search for the page again, as a set does after a channel change. */
  retune(now: number) {
    this.switchedAt = now;
  }

  /** Start the first video (browsers only allow muted autoplay). */
  wake() {
    this.videos.get(this.current.ch)?.play().catch(() => {});
  }

  /** Average colour of the picture, for the light the TV throws on the room. */
  get glow() {
    return this.avg;
  }

  draw(now: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, DECK_W, DECK_H);
    const v = this.videos.get(this.current.ch);
    if (v) this.drawVideo(v, now);
    else this.drawTeletext(now);
    if (this.frame++ % 6 === 0) this.sample();
  }

  private text(s: string, col: number, row: number, color: string, opts: { tall?: boolean } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    const h = opts.tall ? 2 : 1;
    ctx.font = `${CH * 1.12}px VT323, monospace`;
    ctx.translate(col * CW, (row + h) * CH - CH * 0.2 * h);
    ctx.scale(this.fontScale, h);
    ctx.fillText(s, 0, 0);
    ctx.restore();
  }

  private line(line: string, row: number, startCol = 0, tall = false) {
    let col = startCol;
    for (const r of runs(line)) {
      const t = r.text.slice(0, Math.max(0, COLS - col));
      this.text(t, col, row, TT[r.color], { tall });
      col += r.text.length;
    }
  }

  private header(page: number, title: string, now: number) {
    const d = new Date();
    const date = `${DAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    // While "searching" for the page the number counts up, as on a real set.
    const searching = now - this.switchedAt < 0.5;
    const shown = searching ? 100 + Math.floor(((now * 37) % 8) * 100) : page;
    this.text(`P${shown}`, 0, 0, TT.w);
    this.text(title.toUpperCase().slice(0, 14), 6, 0, TT.c);
    this.text(date, 22, 0, TT.w);
    this.text(time, 32, 0, TT.y);
  }

  private banner(spec: { bg: TTKey; fg: TTKey; text: string }, row: number) {
    const ctx = this.ctx;
    const rows = 4;
    ctx.fillStyle = TT[spec.bg];
    ctx.fillRect(0, row * CH, DECK_W, rows * CH);
    // Mosaic: every cell holds 2 x 3 blocks. Glyph pixels are drawn 2 x 2 blocks.
    const bw = CW / 2;
    const bh = CH / 3;
    const scale = 2;
    const text = spec.text;
    const totalCols = text.length * 5 * scale - scale; // glyph 4 + gap 1
    let bx = Math.max(2, Math.floor((COLS * 2 - totalCols) / 2));
    const by = row * 3 + 1;
    ctx.fillStyle = TT[spec.fg];
    for (const ch of text) {
      const g = FONT[ch] ?? FONT[" "];
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 4; x++)
          if (g[y][x] === "#")
            ctx.fillRect((bx + x * scale) * bw, (by + y * scale) * bh, bw * scale + 0.5, bh * scale + 0.5);
      bx += 5 * scale;
    }
  }

  private fastext() {
    const row = ROWS - 1;
    const links: [TTKey, string][] = [
      ["r", "1 Nimbus"],
      ["g", "6 IIKT"],
      ["y", "7 Agents"],
      ["c", "8 About"],
    ];
    links.forEach(([c, t], i) => this.text(t, 1 + i * 10, row, TT[c]));
  }

  private drawTeletext(now: number) {
    const c = this.current;
    this.header(c.page, c.short ?? c.title, now);
    if (now - this.switchedAt < 0.5) return; // page still loading
    const b = BANNER[c.ch];
    if (b) this.banner(b, 2);
    (c.teletext ?? []).forEach((l, i) => this.line(l, 7 + i, 1));
    this.fastext();
  }

  private drawVideo(v: HTMLVideoElement, now: number) {
    const ctx = this.ctx;
    const vh = DECK_W * (9 / 16);
    const top = (DECK_H - vh) / 2;
    if (v.readyState >= 2) ctx.drawImage(v, 0, top, DECK_W, vh);
    const c = this.current;
    // On-screen display: channel number for a few seconds after switching.
    if (now - this.switchedAt < 3.2) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.font = `${CH * 2.6}px VT323, monospace`;
      ctx.fillStyle = TT.g;
      ctx.fillText(`CH ${pad(c.ch)}`, DECK_W - CW * 9, top + CH * 2.6);
      ctx.restore();
    }
    // Lower third in the letterbox bar.
    this.text(c.title.toUpperCase(), 1, ROWS - 3, TT.w);
    this.text(c.kind.split(" · ")[0], 1, ROWS - 2, "#9aa0a6");
    this.text(`P${c.page}`, 1, 1, TT.w);
  }

  private sample() {
    try {
      this.probe.drawImage(this.canvas, 0, 0, 8, 6);
      const d = this.probe.getImageData(0, 0, 8, 6).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
      }
      const n = d.length / 4;
      // Ease towards the new colour so the room light breathes, not flickers.
      const k = 0.25;
      this.avg = [
        this.avg[0] + (r / n - this.avg[0]) * k,
        this.avg[1] + (g / n - this.avg[1]) * k,
        this.avg[2] + (b / n - this.avg[2]) * k,
      ];
    } catch {
      /* a tainted canvas only costs us the room light */
    }
  }
}
