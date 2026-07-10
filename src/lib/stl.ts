"use client";

// Client-side STL loading, caching, and thumbnail generation.
// Geometries are cached per key so the list thumbnails and the interactive
// review viewer share a single download/parse of each file.

import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export const CLAY = 0xc98a6b; // part color, matches the app's clay palette

const geometryCache = new Map<string, Promise<THREE.BufferGeometry>>();
const thumbnailCache = new Map<string, Promise<string>>();

export function isStlFileName(name: string | null | undefined): boolean {
  return !!name && name.toLowerCase().endsWith(".stl");
}

function parseStl(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}

/**
 * Load + parse an STL, cached by key.
 * `key` should be stable per file (fileId for uploads, a generated id for local files).
 */
export function loadStlGeometry(
  key: string,
  getBuffer: () => Promise<ArrayBuffer>
): Promise<THREE.BufferGeometry> {
  let cached = geometryCache.get(key);
  if (!cached) {
    cached = getBuffer().then(parseStl);
    geometryCache.set(key, cached);
    // Drop failed loads so a retry is possible.
    cached.catch(() => geometryCache.delete(key));
  }
  return cached;
}

/** Load a submitted part's STL through the authenticated inline download proxy. */
export function loadStlFromFileId(fileId: string): Promise<THREE.BufferGeometry> {
  return loadStlGeometry(`r2:${fileId}`, async () => {
    const res = await fetch(`/api/download/${fileId}?inline=1`);
    if (!res.ok) throw new Error("Failed to download model");
    return res.arrayBuffer();
  });
}

const localFileKeys = new WeakMap<File, string>();
let localKeyCounter = 0;

/** Stable cache key for a locally-selected (not yet uploaded) File. */
export function localFileKey(file: File): string {
  let key = localFileKeys.get(file);
  if (!key) {
    key = `local:${++localKeyCounter}:${file.name}:${file.size}`;
    localFileKeys.set(file, key);
  }
  return key;
}

export function loadStlFromFile(file: File): Promise<THREE.BufferGeometry> {
  return loadStlGeometry(localFileKey(file), () => file.arrayBuffer());
}

/** Standard part material + lighting so viewer and thumbnails look alike. */
export function createPartMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: CLAY,
    roughness: 0.55,
    metalness: 0.1,
    flatShading: true,
    // STL files in the wild often have inconsistent triangle winding;
    // double-sided rendering keeps them from looking hollowed out.
    side: THREE.DoubleSide,
  });
}

export function addStudioLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0x2a1d16, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 1.4, 1.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9a184, 0.5);
  rim.position.set(-1.2, -0.4, -1);
  scene.add(rim);
}

/** Position a camera so the geometry's bounding sphere fills the view. */
export function frameGeometry(
  camera: THREE.PerspectiveCamera,
  geometry: THREE.BufferGeometry
): number {
  geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere?.radius || 1;
  const distance = radius / Math.sin((camera.fov * Math.PI) / 360);
  camera.position.set(distance * 0.7, distance * 0.55, distance * 0.7);
  camera.near = distance / 100;
  camera.far = distance * 10;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return distance;
}

// One shared offscreen renderer for all thumbnails (WebGL contexts are scarce).
let thumbRenderer: THREE.WebGLRenderer | null = null;

function getThumbRenderer(size: number): THREE.WebGLRenderer {
  if (!thumbRenderer) {
    const canvas = document.createElement("canvas");
    thumbRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    thumbRenderer.setPixelRatio(1);
  }
  thumbRenderer.setSize(size, size, false);
  return thumbRenderer;
}

/**
 * Render a small static PNG preview of an STL geometry, cached by key.
 * Returns a data URL.
 */
export function renderStlThumbnail(
  key: string,
  getGeometry: () => Promise<THREE.BufferGeometry>,
  size = 128
): Promise<string> {
  const cacheKey = `${key}@${size}`;
  let cached = thumbnailCache.get(cacheKey);
  if (!cached) {
    cached = getGeometry().then((geometry) => {
      const renderer = getThumbRenderer(size);
      const scene = new THREE.Scene();
      addStudioLights(scene);
      const material = createPartMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
      frameGeometry(camera, geometry);
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      material.dispose();
      return dataUrl;
    });
    thumbnailCache.set(cacheKey, cached);
    cached.catch(() => thumbnailCache.delete(cacheKey));
  }
  return cached;
}

export function thumbnailForFileId(fileId: string, size = 128): Promise<string> {
  return renderStlThumbnail(`r2:${fileId}`, () => loadStlFromFileId(fileId), size);
}

export function thumbnailForFile(file: File, size = 128): Promise<string> {
  return renderStlThumbnail(localFileKey(file), () => loadStlFromFile(file), size);
}
