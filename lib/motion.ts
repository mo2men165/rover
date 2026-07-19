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

export function glowPulse(el: HTMLElement, rgb = "56,189,248"): () => void {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.to(el, {
    boxShadow: `0 0 0 1px rgba(${rgb},.45), 0 0 32px 4px rgba(${rgb},.55)`,
    duration: 1.6,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  return () => tween.kill();
}

/**
 * Count a number element up from 0 to target. Sourced tier: ui-ux-pro-max
 * gsap domain "Standard" hover/entry timing family, applied to numeric
 * reveal instead of hover.
 */
export function countUp(
  el: HTMLElement,
  target: number,
  options: { duration?: number; prefix?: string; suffix?: string; decimals?: number } = {}
): () => void {
  const decimals = options.decimals ?? 0;
  const format = (n: number) =>
    `${options.prefix ?? ""}${n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${options.suffix ?? ""}`;

  if (prefersReducedMotion()) {
    el.textContent = format(target);
    return () => {};
  }

  const state = { value: 0 };
  const tween = gsap.to(state, {
    value: target,
    duration: options.duration ?? 1.2,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = format(state.value);
    },
  });
  return () => tween.kill();
}

/**
 * Cursor-following magnetic pull. Sourced: ui-ux-pro-max gsap domain
 * "Complex" hover tier (quickTo x/y, elastic.out(1,0.4), pull clamped to
 * strength so the element never leaves its hit box). That tier's own
 * "Don't" rule caps this to 1-2 focal elements per screen (primary CTA,
 * wordmark) — never apply it to list/grid items.
 */
export function magneticHover(el: HTMLElement, strength = 0.3): () => void {
  if (prefersReducedMotion()) return () => {};
  el.style.willChange = "transform";
  const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "elastic.out(1,0.4)" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "elastic.out(1,0.4)" });

  function onMove(e: MouseEvent) {
    const rect = el.getBoundingClientRect();
    xTo((e.clientX - rect.left - rect.width / 2) * strength);
    yTo((e.clientY - rect.top - rect.height / 2) * strength);
  }
  function onLeave() {
    xTo(0);
    yTo(0);
  }

  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
    el.style.willChange = "";
  };
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
