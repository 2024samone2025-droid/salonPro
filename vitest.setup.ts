import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Tear down the rendered DOM between tests.
afterEach(() => {
  cleanup();
});

// jsdom is missing a few browser APIs that Radix UI (Dialog/Select/etc.) touches.
// Polyfill them once so component tests don't trip over missing globals.
const g = globalThis as any;
g.ResizeObserver =
  g.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }) as any);
const ep = Element.prototype as any;
ep.scrollIntoView = ep.scrollIntoView || (() => {});
ep.hasPointerCapture = ep.hasPointerCapture || (() => false);
ep.setPointerCapture = ep.setPointerCapture || (() => {});
ep.releasePointerCapture = ep.releasePointerCapture || (() => {});

// next/navigation is pulled in by most client components. Provide inert
// defaults so components render outside the Next runtime. Individual tests can
// override with vi.mocked(...) if they need to assert navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// sonner toasts: assert on these without mounting a <Toaster />.
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  });
  return { toast, Toaster: () => null };
});
