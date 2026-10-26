import { useEffect } from "react";
import { Link } from "wouter";
import { Page } from "@/components/layout/shell";
import { btn, btnPrimary } from "@/components/kit";

export default function NotFound() {
  useEffect(() => {
    document.title = "Not found · Calamity Watch";
  }, []);
  return (
    <Page>
      <div className="mx-auto max-w-[720px] text-center py-10 md:py-16">
        <div className="relative chart-paper border border-rule-strong h-[140px] mb-10" aria-hidden>
          <svg viewBox="0 0 720 140" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0 96 L120 94 L210 97 L300 95 L360 96" fill="none" stroke="#C8102E" strokeWidth="1.6" />
            <line x1="360" x2="360" y1="20" y2="120" stroke="#15140F" strokeDasharray="3 3" />
          </svg>
          <span className="absolute left-[52%] top-3 mono text-[11px] text-ink-muted">trace ends</span>
        </div>
        <h1 className="display h1-station">No such chart.</h1>
        <p className="mt-5 text-ink-muted max-w-[52ch] mx-auto">The page, place, hazard or alert at this address does not exist, or the link is out of date.</p>
        <p className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={btnPrimary} data-testid="link-notfound-home">Open the board</Link>
          <Link href="/alerts" className={btn} data-testid="link-notfound-alerts">Read the alert ledger</Link>
        </p>
      </div>
    </Page>
  );
}
