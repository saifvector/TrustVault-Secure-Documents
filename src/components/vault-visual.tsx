import { useEffect, useRef, useState } from "react";
import vaultFallback from "@/assets/vault-fallback.jpg";

export function VaultVisual() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) return;
    let disposed = false;
    let cleanup = () => {};
    import("three").then((T) => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }); } catch { return; }
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(34, 1, 0.1, 50);
      camera.position.set(0, 1.3, 7.8); camera.lookAt(0, 0.25, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.setClearColor(0, 0);
      el.appendChild(renderer.domElement);
      const css = getComputedStyle(el);
      const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const color = (name: string) => {
        if (!swatch) return new T.Color();
        swatch.fillStyle = css.getPropertyValue(name).trim(); swatch.fillRect(0, 0, 1, 1);
        const pixels = swatch.getImageData(0, 0, 1, 1).data;
        return new T.Color().setRGB((pixels[0] ?? 0) / 255, (pixels[1] ?? 0) / 255, (pixels[2] ?? 0) / 255, T.SRGBColorSpace);
      };
      const metal = new T.MeshStandardMaterial({ color: color("--vault-metal"), metalness: 0.72, roughness: 0.33 });
      const detail = new T.MeshStandardMaterial({ color: color("--vault-champagne"), metalness: 0.8, roughness: 0.32 });
      const green = new T.MeshStandardMaterial({ color: color("--vault-green"), metalness: 0.35, roughness: 0.24 });
      const group = new T.Group(); scene.add(group);
      const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat = metal) => {
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); group.add(mesh); return mesh;
      };
      box(2.5, 2.4, 1.5, 0, 0, 0); box(2.6, 0.16, 1.65, 0, -1.35, 0);
      box(2.25, 2.15, 0.1, 0, 0, 0.79);
      const ring = (r: number, tube: number, mat: typeof metal) => {
        const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 12, 64), mat); mesh.position.set(0, 0, 0.89); group.add(mesh);
      };
      ring(0.89, 0.065, detail); ring(0.75, 0.025, green); ring(0.28, 0.045, detail);
      const hub = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.15, 32), detail); hub.rotation.x = Math.PI / 2; hub.position.z = 1.02; group.add(hub);
      for (let i = 0; i < 4; i++) { const spoke = box(0.065, 0.95, 0.06, 0, 0, 1.01, detail); spoke.rotation.z = i * Math.PI / 4; }
      for (let i = 0; i < 4; i++) { const sheet = box(1.95, 0.045, 1.3, 0, 1.55 + i * 0.19, 0, green); sheet.rotation.y = i * 0.025; }
      box(0.12, 1.6, 0.15, 1.12, 0, 0.92, detail);
      scene.add(new T.HemisphereLight(color("--vault-light"), color("--vault-metal"), 3));
      const key = new T.DirectionalLight(color("--vault-light"), 5); key.position.set(-3, 5, 6); scene.add(key);
      const rim = new T.DirectionalLight(color("--vault-green"), 3); rim.position.set(4, 2, -2); scene.add(rim);
      const resize = () => { const { width, height } = el.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(el); resize();
      let visible = true; const intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; }); intersection.observe(el);
      const pointer = { x: 0, y: 0 };
      const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); pointer.x = (e.clientX - r.left) / r.width - 0.5; pointer.y = (e.clientY - r.top) / r.height - 0.5; };
      el.addEventListener("pointermove", move);
      const start = performance.now();
      renderer.setAnimationLoop(() => { if (!visible || document.hidden) return; const t = (performance.now() - start) / 1000; group.rotation.y += (-0.36 + Math.sin(t * 0.25) * 0.07 + pointer.x * 0.17 - group.rotation.y) * 0.04; group.rotation.x += (0.08 + pointer.y * 0.08 - group.rotation.x) * 0.04; group.position.y = Math.sin(t * 0.7) * 0.045; renderer.render(scene, camera); });
      setReady(true);
      cleanup = () => { observer.disconnect(); intersection.disconnect(); el.removeEventListener("pointermove", move); renderer.setAnimationLoop(null); scene.traverse((obj) => { if (obj instanceof T.Mesh) obj.geometry.dispose(); }); metal.dispose(); detail.dispose(); green.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    }).catch(() => {});
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div className="vault-visual" role="img" aria-label="Dimensional private document vault with layered green documents"><img src={vaultFallback} width={1024} height={1024} alt="Brushed-metal document vault with layered green security sheets" className={ready ? "vault-fallback is-hidden" : "vault-fallback"} /><div ref={host} className="vault-canvas" /></div>;
}