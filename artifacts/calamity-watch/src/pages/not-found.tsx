import { useEffect } from "react";
import { Link } from "wouter";
import { Page } from "@/components/layout/shell";

export default function NotFound() {
  useEffect(() => {
    document.title = "Not found · Calamity Watch";
  }, []);
  return (
    <Page>
      <h1 className="text-[28px] leading-[34px]">Nothing at this address</h1>
      <p className="mt-2 text-muted-foreground max-w-[60ch]">The page, place, hazard or alert you asked for does not exist, or the link is out of date.</p>
      <p className="mt-4 flex gap-4">
        <Link href="/" className="text-[#15140F] underline underline-offset-2" data-testid="link-notfound-home">Open the situation board</Link>
        <Link href="/alerts" className="text-[#15140F] underline underline-offset-2" data-testid="link-notfound-alerts">See all alerts</Link>
      </p>
    </Page>
  );
}
