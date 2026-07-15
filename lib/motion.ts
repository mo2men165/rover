import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shineSweep(
  el: HTMLElement,
  options: { loop?: boolean; duration?: number; delay?: number } = {}
): () => void {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.fromTo(
    el,
    { xPercent: -130 },
    {
      xPercent: 230,
      duration: options.duration ?? 1.1,
      delay: options.delay ?? 0,
      ease: "power2.inOut",
      repeat: options.loop ? -1 : 0,
      repeatDelay: options.loop ? 4 : 0,
    }
  );
  return () => tween.kill();
}

export function glowPulse(el: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.to(el, {
    boxShadow:
      "0 0 0 1px rgba(48,169,223,.45), 0 0 32px 4px rgba(48,169,223,.55)",
    duration: 1.6,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  return () => tween.kill();
}

export function gradientDrift(el: HTMLElement): () => void {
  if (prefersReducedMotion()) {
    el.style.setProperty("--gradient-angle", "135deg");
    return () => {};
  }
  const state = { angle: 105 };
  const tween = gsap.to(state, {
    angle: 225,
    duration: 9,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    onUpdate: () => {
      el.style.setProperty("--gradient-angle", `${state.angle}deg`);
    },
  });
  return () => tween.kill();
}

export function staggerIn(
  els: HTMLElement[] | NodeListOf<Element>,
  options: { delay?: number } = {}
): void {
  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    els,
    { opacity: 0, y: 8 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: "power2.out",
      stagger: 0.04,
      delay: options.delay ?? 0,
    }
  );
}
