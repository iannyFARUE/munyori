import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import Canvas from "./components/Canvas";
import ChatPanel from "./components/chat/ChatPanel";
import "./App.css";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
  newElementWith,
} from "@excalidraw/excalidraw";

import { serializeCanvasState } from "./context/canvas-state";

// One agent instance per page load. The canvas state lives only in the
// browser, so persisting chat history across refreshes would leave a dead
// conversation referencing diagrams that no longer exist. Generated at the
// module level so React StrictMode's double mount doesn't change it.
const sessionId = crypto.randomUUID();

// Drop null valued fields. Our tool schemas use nullable rather than
// optional so OpenAI strict mode stays on, which means the agent always
// sends every field. Excalidraw expects undefined for "use the default,"
// not null, and choking on `points: null` for a rectangle is a real bug.
function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null) out[k] = v;
  }
  return out;
}

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Hold the latest excalidrawAPI in a ref so onToolCall (captured once at
  // hook init) always reads the live API instead of a stale closure copy.
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  // Track which tool calls we have already applied to the canvas so we
  // don't apply the same elements twice as messages re-render.
  const appliedToolCalls = useRef<Set<string>>(new Set());

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  // Connect to a fresh agent instance for this page load
  const agent = useAgent({ agent: "design-agent", name: sessionId });

  // useAgentChat manages the chat protocol on top of the agent connection.
  // It gives us the messages array, a sendMessage function, and a status.
  const { messages, sendMessage, status } = useAgentChat({
    agent,
    onToolCall: async ({ toolCall, addToolOutput }) => {
      const api = excalidrawAPIRef.current;
      if (!api) {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: { error: "canvas not ready" },
        });
        return;
      }

      if (toolCall.toolName === "queryCanvas") {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: {
            summary: serializeCanvasState(api.getSceneElements() as unknown[]),
          },
        });
        return;
      }
    },
  });

  // Wrap sendMessage so every outgoing user message also carries a snapshot
  // of the current canvas state in a data-canvas-state part. The worker
  // reads this off the latest user message and serializes it into the
  // system prompt. This is the lesson 6 transport for canvas awareness; a
  // later lesson will replace it with a client side tool the agent can
  // call directly when it actually needs the info.
  const sendWithCanvas = useMemo(
    () => (msg: { role: "user"; parts: { type: "text"; text: string }[] }) => {
      const elements = excalidrawAPI?.getSceneElements() ?? [];
      sendMessage({
        ...msg,
        parts: [
          ...msg.parts,
          { type: "data-canvas-state", data: { elements } } as never,
        ],
      });
    },
    [sendMessage, excalidrawAPI],
  );

  return (
    <div className={`app ${theme}`}>
      <div className="canvas-container">
        <Canvas onApiReady={handleApiReady} onThemeChange={setTheme} />
      </div>
      <ChatPanel
        messages={messages}
        sendMessage={sendWithCanvas}
        status={status}
      />
    </div>
  );
}
