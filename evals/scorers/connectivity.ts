import type { EvalScorer } from "braintrust";
import type { AgentOutput } from "./schema";
import type { GoldenTestCase } from "../buildMessages";

// Words that strongly imply the user wants a connected graph. We look for
// these in the prompt before deciding the scorer applies. If you find a
// failure case where the scorer should fire but doesn't, add the keyword
// here.
const CONNECTED_HINTS = [
  "flow",
  "sequence",
  "between",
  "from",
  "to ",
  "pipeline",
  "chain",
  "process",
];

const SHAPE_TYPES = new Set(["rectangle", "ellipse", "diamond"]);

export const connectivityScorer: EvalScorer<
  GoldenTestCase,
  AgentOutput,
  GoldenTestCase
> = ({ output, input }) => {
  const prompt = (input?.input ?? "").toLowerCase();
  if (!CONNECTED_HINTS.some((h) => prompt.includes(h))) return null;

  const elements = (output.elements ?? []) as Record<string, unknown>[];
  const shapes = elements.filter(
    (el) => typeof el?.type === "string" && SHAPE_TYPES.has(el.type as string),
  );
  if (shapes.length < 2) return null;

  // Build an undirected adjacency map keyed by shape id. Arrows contribute
  // an edge in both directions (we don't care about arrow direction for
  // reachability, just whether the shapes are connected at all).
  const adj = new Map<string, Set<string>>();
  for (const shape of shapes) {
    if (typeof shape.id === "string") adj.set(shape.id, new Set());
  }

  for (const el of elements) {
    if (el?.type !== "arrow") continue;
    const start = (el.startBinding as { elementId?: string } | null | undefined)
      ?.elementId;
    const end = (el.endBinding as { elementId?: string } | null | undefined)
      ?.elementId;
    // Only count arrows whose BOTH endpoints land on shapes we know about.
    // Floating arrows don't contribute to connectivity (they can't, there's
    // nothing to connect to).
    if (!start || !end) continue;
    if (adj.has(start) && adj.has(end)) {
      adj.get(start)!.add(end);
      adj.get(end)!.add(start);
    }
  }

  // BFS from the first shape. Count how many distinct shapes we can reach.
  // Anything we don't visit is in a separate component (a disconnected
  // island), which lowers the score.
  const start = shapes[0]!.id as string;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return {
    name: "Connectivity",
    score: seen.size / shapes.length,
    metadata: { reachable: seen.size, total: shapes.length },
  };
};
