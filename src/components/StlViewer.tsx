"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box, RotateCcw } from "lucide-react";
import {
  addStudioLights,
  createPartMaterial,
  frameGeometry,
  isStlFileName,
  loadStlFromFile,
  loadStlFromFileId,
} from "@/lib/stl";

interface StlViewerProps {
  /** Locally-selected file (pre-upload preview). Takes precedence over fileId. */
  file?: File | null;
  /** Uploaded file id — loaded via the authenticated download proxy. */
  fileId?: string | null;
  /** Original file name, used to detect non-STL (e.g. ZIP) uploads. */
  fileName?: string;
  className?: string;
}

/**
 * Interactive 3D preview of an STL part: drag to orbit, scroll to zoom,
 * right-drag to pan. Falls back to a friendly notice for ZIP uploads.
 */
export default function StlViewer({ file, fileId, fileName, className = "" }: StlViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const homeRef = useRef<THREE.Vector3 | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "unsupported">("loading");

  const name = fileName ?? file?.name ?? "";
  const isStl = isStlFileName(name) || (!name && !!(file || fileId));

  useEffect(() => {
    if (!isStl || (!file && !fileId)) {
      setState(isStl ? "loading" : "unsupported");
      return;
    }
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    setState("loading");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    addStudioLights(scene);

    const camera = new THREE.PerspectiveCamera(
      40,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      1000
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const material = createPartMaterial();
    let mesh: THREE.Mesh | null = null;
    let grid: THREE.GridHelper | null = null;
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    const load = file ? loadStlFromFile(file) : loadStlFromFileId(fileId!);
    load
      .then((geometry) => {
        if (disposed) return;
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
        grid = new THREE.GridHelper(span * 2.5, 20, 0x8a5f4d, 0x4a352b);
        grid.position.y = box.min.y;
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.35;
        scene.add(grid);

        frameGeometry(camera, geometry);
        homeRef.current = camera.position.clone();
        controls.update();
        setState("ready");
        animate();
      })
      .catch(() => {
        if (!disposed) setState("error");
      });

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      controlsRef.current = null;
      material.dispose();
      if (grid) {
        (grid.material as THREE.Material).dispose();
        grid.geometry.dispose();
      }
      // Geometry stays in the shared cache; only dispose scene-level resources.
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [file, fileId, isStl]);

  const resetView = () => {
    const controls = controlsRef.current;
    const home = homeRef.current;
    if (controls && home) {
      controls.object.position.copy(home);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  if (!isStl) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 border border-dashed border-clay-500/25 bg-espresso-900/40 rounded-md text-center p-6 ${className}`}
      >
        <Box className="h-8 w-8 text-clay-400/60" aria-hidden="true" />
        <p className="text-xs text-cream-500">
          3D preview is only available for .STL files.
          <br />
          ZIP archives are reviewed manually by our team.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-md border border-clay-500/20 bg-espresso-900/60 ${className}`}>
      <div ref={mountRef} className="absolute inset-0" aria-label="Interactive 3D model preview" role="img" />
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-espresso-900/60">
          <span className="h-6 w-6 rounded-full border-2 border-clay-500/30 border-t-clay-400 animate-spin" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-500">Loading model…</p>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-espresso-900/60 p-6 text-center">
          <Box className="h-8 w-8 text-red-300/70" aria-hidden="true" />
          <p className="text-xs text-red-300">Couldn&apos;t load the 3D preview for this file.</p>
        </div>
      )}
      {state === "ready" && (
        <>
          <button
            type="button"
            onClick={resetView}
            className="absolute top-2 right-2 inline-flex items-center gap-1.5 border border-clay-500/25 bg-espresso-900/80 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cream-400 hover:text-clay-300 hover:border-clay-400 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset view
          </button>
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-cream-600">
            Drag to rotate · Scroll to zoom
          </p>
        </>
      )}
    </div>
  );
}
