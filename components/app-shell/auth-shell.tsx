import Image from "next/image";
import type { ReactNode } from "react";

interface AuthShellProps {
  /** Rendered under the "ROVER" wordmark. Defaults to the product tagline. */
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Shared shell for the unauthenticated auth pages (/login, /auth/set-password).
 * Reproduces the app shell's ambient-orb background (see app/(app)/layout.tsx)
 * behind a single centered glass card, since auth pages live outside that
 * layout and don't get the orbs for free.
 */
export function AuthShell({ subtitle = "Customer Success Hub", children }: AuthShellProps) {
  return (
    <div className="gradient-mesh relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden className="ambient-orb-1" />
      <div aria-hidden className="ambient-orb-2" />

      <div className="relative z-[1] w-full max-w-[400px] rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-9 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-[28px] backdrop-saturate-[170%]">
        <div className="mb-8 flex flex-col items-center gap-3.5 text-center">
          <Image
            src="/logo-mark.png"
            alt=""
            width={48}
            height={48}
            className="drop-shadow-[0_0_20px_oklch(74%_0.15_224/0.5)]"
            priority
          />
          <div>
            <h1 className="font-heading text-[22px] font-bold text-ink">ROVER</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
