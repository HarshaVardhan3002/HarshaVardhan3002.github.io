import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import type { TvScene } from "./scene";
import { bgFrag, contentFrag, crtFrag, glassFrag, quadVert } from "./shaders";

const MARGIN = 36;
type QuadMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/**
 * Lives inside the ShaderGradient canvas. Each frame: the gradient (the
 * signal) goes into a texture; the glass panels bend it and the painted
 * picture goes on top; then the whole frame goes through the picture tube.
 */
export function TvPass({ scene }: { scene: TvScene }) {
  const { gl, scene: world, camera, size } = useThree();
  const signal = useFBO({ samples: 0, depthBuffer: true });
  const frame = useFBO({ samples: 0, depthBuffer: false });

  const parts = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1);
    const ortho = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    const overlay = new THREE.Scene();
    const tube = new THREE.Scene();
    const tex = new THREE.CanvasTexture(scene.canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const mat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, transparent = false) =>
      new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader, uniforms, transparent, depthTest: false, depthWrite: false });

    const bg: QuadMesh = new THREE.Mesh(quad, mat(bgFrag, { uTex: { value: null }, uDim: { value: 1 } }));
    bg.renderOrder = -1;
    overlay.add(bg);
    const content: QuadMesh = new THREE.Mesh(quad, mat(contentFrag, { uTex: { value: tex } }, true));
    content.renderOrder = 10000;
    overlay.add(content);
    const crt: QuadMesh = new THREE.Mesh(
      quad,
      mat(crtFrag, {
        uTex: { value: null },
        uRes: { value: new THREE.Vector2() },
        uDpr: { value: 1 },
        uTime: { value: 0 },
        uCurve: { value: 1 },
        uPower: { value: 0 },
        uStatic: { value: 0 },
        uRoll: { value: 0 },
        uSplit: { value: 0 },
        uFlash: { value: 0 },
        uMotion: { value: 1 },
      }),
    );
    tube.add(crt);

    const pool: QuadMesh[] = [];
    const glassMesh = (i: number) => {
      if (!pool[i]) {
        const m: QuadMesh = new THREE.Mesh(
          quad,
          mat(
            glassFrag,
            {
              uTex: { value: null },
              uView: { value: new THREE.Vector2() },
              uSize: { value: new THREE.Vector2() },
              uCenter: { value: new THREE.Vector2() },
              uMargin: { value: MARGIN },
              uRadius: { value: 0 },
              uBend: { value: 0 },
              uFrost: { value: 0 },
              uTint: { value: new THREE.Color() },
              uTintAmt: { value: 0 },
              uAlpha: { value: 1 },
              uDim: { value: 1 },
            },
            true,
          ),
        );
        m.renderOrder = i;
        overlay.add(m);
        pool[i] = m;
      }
      return pool[i];
    };
    return { quad, ortho, overlay, tube, tex, bg, content, crt, pool, glassMesh };
  }, [scene]);

  useEffect(
    () => () => {
      const { quad, tex, bg, content, crt, pool } = parts;
      [bg, content, crt, ...pool].forEach((m) => m.material.dispose());
      tex.dispose();
      quad.dispose();
    },
    [parts],
  );

  useFrame(() => {
    const { ortho, overlay, tube, tex, bg, content, crt, pool, glassMesh } = parts;
    const now = performance.now() / 1000;
    const W = size.width;
    const H = size.height;
    const dpr = gl.getPixelRatio();
    if (scene.resize(W, H, dpr)) tex.dispose();
    const f = scene.draw(now);
    tex.needsUpdate = true;

    gl.setRenderTarget(signal);
    gl.clear();
    gl.render(world, camera);

    ortho.right = W;
    ortho.top = H;
    ortho.updateProjectionMatrix();
    for (const m of [bg, content, crt]) {
      m.scale.set(W, H, 1);
      m.position.set(W / 2, H / 2, 0);
    }
    bg.material.uniforms.uTex.value = signal.texture;
    bg.material.uniforms.uDim.value = f.dim;

    let used = 0;
    for (const g of f.glass) {
      if (g.alpha < 0.002 || g.y > H + MARGIN || g.y + g.h < -MARGIN || g.w < 2 || g.h < 2) continue;
      const m = glassMesh(used++);
      m.visible = true;
      const cx = g.x + g.w / 2;
      const cy = H - (g.y + g.h / 2);
      m.scale.set(g.w + MARGIN * 2, g.h + MARGIN * 2, 1);
      m.position.set(cx, cy, 0);
      const u = m.material.uniforms;
      u.uTex.value = signal.texture;
      u.uView.value.set(W, H);
      u.uSize.value.set(g.w, g.h);
      u.uCenter.value.set(cx, cy);
      u.uRadius.value = g.r;
      u.uBend.value = g.bend;
      u.uFrost.value = g.frost;
      (u.uTint.value as THREE.Color).set(g.tint);
      u.uTintAmt.value = g.tintAmt;
      u.uAlpha.value = g.alpha;
      u.uDim.value = f.dim;
    }
    for (let i = used; i < pool.length; i++) pool[i].visible = false;

    gl.setRenderTarget(frame);
    gl.clear();
    gl.render(overlay, ortho);

    const u = crt.material.uniforms;
    const fx = scene.fx;
    u.uTex.value = frame.texture;
    u.uRes.value.set(W * dpr, H * dpr);
    u.uDpr.value = dpr;
    u.uTime.value = now % 1000;
    u.uCurve.value = scene.curve;
    u.uPower.value = fx.power;
    u.uStatic.value = fx.static;
    u.uRoll.value = fx.roll;
    u.uSplit.value = fx.split;
    u.uFlash.value = fx.flash;
    u.uMotion.value = scene.motion;
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(tube, ortho);
  }, 1);

  return null;
}
