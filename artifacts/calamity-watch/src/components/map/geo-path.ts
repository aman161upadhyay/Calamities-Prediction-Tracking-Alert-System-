/**
 * Flat [lon, lat, …] rings to an SVG path. The 110m land data crosses the antimeridian with an explicit jump from
 * 180 to −180 (eastern Chukotka, Wrangel Island, Fiji); drawn naively that jump is a line across the whole map, and
 * on a filled ring it is a band. Each jump starts a new subpath instead, closed on its own side of the edge.
 */
export function ringsToPath(rings: number[][], x: (lon: number) => number, y: (lat: number) => number, close: boolean): string {
  let d = "";
  for (const r of rings) {
    let open = false;
    for (let k = 0; k < r.length; k += 2) {
      const jump = k > 0 && Math.abs(r[k] - r[k - 2]) > 180;
      if (jump && open) {
        if (close) d += "Z";
        open = false;
      }
      d += `${open ? "L" : "M"}${x(r[k]).toFixed(1)},${y(r[k + 1]).toFixed(1)}`;
      open = true;
    }
    if (close && open) d += "Z";
  }
  return d;
}
