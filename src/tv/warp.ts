// The curve of the picture tube. The CRT shader and the pointer both use this,
// so a click lands on what you see, even near the bowed edges.

export const CURVE = { kx: 0.045, ky: 0.06, inset: 0.016 };

/** Screen point (CSS px) to the point of the flat picture shown there. */
export function screenToSource(x: number, y: number, w: number, h: number, amount: number): [number, number] {
  const px = (x / w) * 2 - 1;
  const py = (y / h) * 2 - 1;
  const grow = 1 + CURVE.inset * amount;
  const qx = px * (1 + py * py * CURVE.kx * amount) * grow;
  const qy = py * (1 + px * px * CURVE.ky * amount) * grow;
  return [((qx + 1) / 2) * w, ((qy + 1) / 2) * h];
}
