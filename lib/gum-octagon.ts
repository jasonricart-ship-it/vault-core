export const GUM_OCTAGON_PANELS = 10;

export function isGumOctagonComplete(
  items: {
    corridor_segment: number;
    display_position: number | null;
    status: string;
  }[],
  segment = 1,
): boolean {
  for (let position = 1; position <= GUM_OCTAGON_PANELS; position += 1) {
    const item = items.find(
      (entry) =>
        entry.corridor_segment === segment &&
        entry.display_position === position &&
        entry.status === "authenticated",
    );
    if (!item) return false;
  }
  return true;
}
