import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
const listeners = new Set<() => void>();
let device: HTMLElement | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function snapshot(): HTMLElement | null {
  return device && window.matchMedia(DESKTOP_QUERY).matches ? device : null;
}

export function registerDevice(element: HTMLElement | null): () => void {
  if (!element) return () => {};
  device = element;
  notify();
  return () => {
    if (device !== element) return;
    device = null;
    notify();
  };
}

export function useFrameTarget(): HTMLElement | null {
  return useSyncExternalStore(subscribe, snapshot);
}

const DEVICE_WIDTH = 410;
const DEVICE_HEIGHT = 864;
const STAGE_GUTTER = 48;

function fitZoom(): number {
  const byHeight = (window.innerHeight - STAGE_GUTTER) / DEVICE_HEIGHT;
  const byWidth = (window.innerWidth - STAGE_GUTTER) / DEVICE_WIDTH;
  return Math.min(1, byHeight, byWidth);
}

function subscribeResize(listener: () => void): () => void {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

export function useDeviceZoom(): number | undefined {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches);
  const zoom = useSyncExternalStore(subscribeResize, fitZoom);
  return desktop ? zoom : undefined;
}
