"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gradientDrift, shineSweep } from "@/lib/motion";

export default function LoginPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroShineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;
    const stopDrift = gradientDrift(heroRef.current);
    let stopShine: (() => void) | undefined;
    if (heroShineRef.current) {
      stopShine = shineSweep(heroShineRef.current, {
        loop: true,
        duration: 2.2,
      });
    }
    return () => {
      stopDrift();
      stopShine?.();
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      <div
        ref={heroRef}
        className="relative hidden w-[55%] items-center justify-center overflow-hidden md:flex"
        style={{
          backgroundImage:
            "linear-gradient(var(--gradient-angle, 135deg), var(--void), var(--surface-raised-start) 45%, var(--metallic-edge) 100%)",
        }}
      >
        <span
          ref={heroShineRef}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(48,169,223,0.25) 50%, transparent 70%)",
            transform: "translateX(-130%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative flex flex-col items-center gap-4 px-10 text-center">
          <Image
            src="/logo-mark.png"
            alt=""
            width={96}
            height={96}
            className="drop-shadow-[0_0_36px_rgba(48,169,223,0.55)]"
            priority
          />
          <p className="text-chrome font-heading text-2xl italic">ROVER</p>
          <p className="text-sm tracking-[0.2em] text-ink-muted uppercase">
            Customer Success Hub
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center md:hidden">
            <Image
              src="/logo-mark.png"
              alt=""
              width={48}
              height={48}
              className="mx-auto mb-3 drop-shadow-[0_0_20px_rgba(48,169,223,0.5)]"
            />
            <h1 className="font-heading text-2xl italic text-ink">ROVER</h1>
            <p className="mt-1 text-sm text-ink-muted">Customer Success Hub</p>
          </div>

          <p className="mb-6 hidden text-xs font-medium uppercase tracking-[0.2em] text-ink-muted md:block">
            Sign in
          </p>

          <form className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm text-ink">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="name@res-va.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm text-ink">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" pulse className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-muted">
            Access is by invitation only. Contact your System Administrator if
            you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
