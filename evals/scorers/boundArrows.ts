import type { EvalScorer } from "braintrust";
import type { AgentOutput } from "./schema";
import type { GoldenTestCase } from "../buildMessages";

export const boundArrowsScorer: EvalScorer<
  GoldenTestCase,
  AgentOutput,
  GoldenTestCase
> = ({ output }) => {
  const elements = (output.elements ?? []) as Record<string, unknown>[];

  // Build a set of every id present in the output. We check binding targets
  // against this set: if an arrow points at an id we've never seen, the
  // binding is broken.
  const ids = new Set(
    elements
      .map((el) => (typeof el?.id === "string" ? el.id : null))
      .filter(Boolean) as string[],
  );

  const arrows = elements.filter((el) => el?.type === "arrow");
  if (arrows.length === 0) return null;

  let bound = 0;
  const broken: string[] = [];
  for (const arrow of arrows) {
    // Both endpoints must be present AND must reference an id we know about.
    // Either condition failing counts as a broken arrow.
    const start = arrow.startBinding as
      | { elementId?: string }
      | null
      | undefined;
    const end = arrow.endBinding as { elementId?: string } | null | undefined;
    const ok = !!(
      start?.elementId &&
      end?.elementId &&
      ids.has(start.elementId) &&
      ids.has(end.elementId)
    );
    if (ok) bound += 1;
    else broken.push(typeof arrow.id === "string" ? arrow.id : "(no id)");
  }

  return {
    name: "BoundArrows",
    score: bound / arrows.length,
    // metadata is what shows up in the Braintrust dashboard when you click
    // a row. The list of broken arrow ids makes it easy to spot a pattern.
    metadata: { bound, total: arrows.length, broken },
  };
};
