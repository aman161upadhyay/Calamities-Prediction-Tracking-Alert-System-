/** Corner brackets for the two instruments that plot: the recorder and the map frame. */
export function FrameMarks({ inset = -5, size = 12 }: { inset?: number; size?: number }) {
  const s = { width: size, height: size } as const;
  const c = "absolute pointer-events-none border-ink";
  return (
    <span aria-hidden>
      <span className={`${c} border-l-[1.5px] border-t-[1.5px]`} style={{ ...s, left: inset, top: inset }} />
      <span className={`${c} border-r-[1.5px] border-t-[1.5px]`} style={{ ...s, right: inset, top: inset }} />
      <span className={`${c} border-l-[1.5px] border-b-[1.5px]`} style={{ ...s, left: inset, bottom: inset }} />
      <span className={`${c} border-r-[1.5px] border-b-[1.5px]`} style={{ ...s, right: inset, bottom: inset }} />
    </span>
  );
}
