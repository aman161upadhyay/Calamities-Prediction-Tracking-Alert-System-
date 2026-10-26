import { useEffect } from "react";
import { Link } from "wouter";
import { Page } from "@/components/layout/shell";
import { btn, btnPrimary } from "@/components/kit";

export default function NotFound() {
  useEffect(() => {
    document.title = "Not found · Calamity Watch Post";
  }, []);
  return (
    <Page>
      <div className="mx-auto max-w-[720px] text-center py-10 md:py-16">
        {/* A tape whose dots stop: the trace ends where the page should have been. */}
        <div className="relative h-[120px] mb-10" aria-hidden>
          <svg viewBox="0 0 720 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <line x1="40" x2="680" y1="90" y2="90" stroke="var(--cr-rule)" />
            <path d="M60 78 L120 74 L180 80 L240 70 L300 76 L360 72" fill="none" stroke="var(--cr-ink)" strokeOpacity="0.18" />
            {[60, 120, 180, 240, 300, 360].map((x, i) => {
              const y = [78, 74, 80, 70, 76, 72][i];
              return (
                <g key={x}>
                  <circle cx={x} cy={y} r={10} fill="var(--hz-flood)" opacity={0.14} />
                  <circle cx={x} cy={y} r={3} fill="var(--hz-flood)" />
                </g>
              );
            })}
            <line x1="400" x2="400" y1="30" y2="100" stroke="var(--cr-ink)" strokeDasharray="3 3" />
          </svg>
          <span className="absolute left-[58%] top-2 mono text-[11px] text-ink-muted">trace ends</span>
        </div>
        <h1 className="display h1-station">No such page.</h1>
        <p className="mt-5 text-ink-muted max-w-[52ch] mx-auto">The page, place, hazard or alert at this address does not exist, or the link is out of date.</p>
        <p className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={btnPrimary} data-testid="link-notfound-home">Open the board</Link>
          <Link href="/alerts" className={btn} data-testid="link-notfound-alerts">Read the alert ledger</Link>
        </p>
      </div>
    </Page>
  );
}
