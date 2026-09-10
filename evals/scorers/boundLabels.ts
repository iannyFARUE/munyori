import type { EvalScorer } from "braintrust";
import type { AgentOutput } from "./schema";
import type { GoldenTestCase } from "../buildMessages";

const SHAPE_TYPES = new Set(["rectangle", "ellipse", "diamond"]);

export const boundLabelsScorer: EvalScorer<
  GoldenTestCase,
  AgentOutput,
  GoldenTestCase
> = ({ output }) => {
  const elements = (output.elements ?? []) as Record<string, unknown>[];
  const shapes = elements.filter(
    (el) => typeof el?.type === "string" && SHAPE_TYPES.has(el.type as string),
  );
  if (shapes.length === 0) return null;

  // First pass: collect every shape id that has at least one text element
  // pointing at it via containerId. Containment is what makes a label
  // "bound" (and what makes Excalidraw center it inside the shape).
  const boundLabelShapeIds = new Set<string>();
  for (const el of elements) {
    if (el?.type !== "text") continue;
    const containerId = el.containerId;
    if (typeof containerId === "string" && containerId.length > 0) {
      boundLabelShapeIds.add(containerId);
    }
  }

  // Second pass: walk every shape and check whether it appears in the set
  // we just built. The unlabeled list goes into metadata so the dashboard
  // can show which shapes the model forgot to label.
  let labeled = 0;
  const unlabeled: string[] = [];
  for (const shape of shapes) {
    const id = typeof shape.id === "string" ? shape.id : null;
    if (id && boundLabelShapeIds.has(id)) labeled += 1;
    else unlabeled.push(id ?? "(no id)");
  }

  return {
    name: "BoundLabels",
    score: labeled / shapes.length,
    metadata: { labeled, total: shapes.length, unlabeled },
  };
};
