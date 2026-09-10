// Aggregator. The agent gets one record of all available tools, but each
// tool lives in its own file under src/tools/ for clarity.
//
// queryCanvas is a CLIENT side tool — its definition has no execute function
// and is fulfilled by App.tsx via useAgentChat's onToolCall handler.
//
// searchWeb needs the Tavily API key from env, so it's built per-request via
// makeSearchWeb(apiKey) instead of being a static export.

import { addElements } from "./tools/add-elements";
import { removeElements } from "./tools/remove-elements";
import { updateElements } from "./tools/update-elements";
import { queryCanvas } from "./tools/query-canvas";
import { makeSearchWeb } from "./tools/search-web";

export function buildTools(env: { TAVILY_API_KEY?: string }) {
  return {
    addElements,
    removeElements,
    updateElements,
    queryCanvas,
    searchWeb: makeSearchWeb(env.TAVILY_API_KEY),
  };
}
