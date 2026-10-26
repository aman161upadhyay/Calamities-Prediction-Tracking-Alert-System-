import { useEffect, useState } from "react";

export type Variant = "a" | "b";

export function currentVariant(): Variant {
  if (typeof document === "undefined") return "a";
  return document.documentElement.getAttribute("data-variant") === "b" ? "b" : "a";
}

/** The theme under review, read from <html data-variant>; follows the switch without a reload. */
export function useVariant(): Variant {
  const [v, setV] = useState<Variant>(currentVariant);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const mo = new MutationObserver(() => setV(currentVariant()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-variant"] });
    return () => mo.disconnect();
  }, []);
  return v;
}
