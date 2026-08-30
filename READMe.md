# Munyori

A live diagramming agent that:

- Reads natural language requests ("draw a sequence diagram of an OAuth login")
- Controls an Excalidraw canvas via structured tool calls (add/update/remove elements)
- Reads the live canvas state on demand
- Searches the web for fresh information when it needs to
- Searches a private knowledge corpus via RAG when it needs precise reference material
- Streams responses, shows tool status, handles approvals, and gets better at all of this as you measure it

## Setup

### 1. Clone and install

```bash
git clone <this repo url>
cd munyori
npm install
```

### 2. Create accounts

You need accounts at four services. Three are free with no credit card. One needs a credit card but the costs for this course are pennies.

| Service            | Why                                                        | Cost                             | Credit card required? |
| ------------------ | ---------------------------------------------------------- | -------------------------------- | --------------------- |
| **OpenAI**         | LLM provider for the agent                                 | A few cents for the whole course | **Yes**               |
| **Upstash Vector** | Vector store for RAG (lesson 8)                            | Free tier, very generous         | No                    |
| **Braintrust**     | Eval platform (lessons 4+)                                 | Free tier                        | No                    |
| **Tavily**         | Web search API for the agent's `searchWeb` tool (lesson 7) | Free tier, 1000 searches/month   | No                    |

#### OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com).
2. Add a payment method. The course costs pennies but OpenAI requires a card on file before issuing API keys.
3. Create an API key under **API keys**. Save it for the next step.

#### Upstash Vector

1. Sign up at [upstash.com](https://upstash.com). No credit card needed.
2. Go to **Vector** in the console and click **Create Index**.
3. Pick any embedding model from the dropdown — `mixedbread-ai/mxbai-embed-large-v1` is a good default. The model is hosted by Upstash, which is what lets the embed script and the agent skip the embedding step entirely.
4. Pick a region close to you. Free tier is fine.
5. After creation, the index page shows `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN`. Save both.

#### Braintrust

1. Sign up at [braintrust.dev](https://braintrust.dev). No credit card needed.
2. Create an API key from settings. Save it.

#### Tavily

1. Sign up at [tavily.com](https://tavily.com). No credit card needed.
2. Get your API key from the dashboard. Save it.

### 3. Configure environment variables

Create `.dev.vars` at the project root:

```
OPENAI_API_KEY=sk-...
UPSTASH_VECTOR_REST_URL=https://...upstash.io
UPSTASH_VECTOR_REST_TOKEN=...
BRAINTRUST_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

The Worker reads from this file via `wrangler dev` automatically. Node scripts (`npm run embed`, `npm run eval`) read it via `dotenv-cli`.

### 4. Run things

```bash
npm run dev      # start the app at http://localhost:5173 (or 5174/5175 if 5173 is taken)
npm run embed    # rebuild the RAG vector index from data/corpus/
npm run eval     # run the eval suite
```

## Tech stack

- **Runtime**: Node + Cloudflare Workers (local via `wrangler dev`, no deployment needed)
- **Frontend**: Vite + React + Excalidraw
- **Agent**: AI SDK + Cloudflare Agents SDK (Durable Objects, `useAgentChat`)
- **Vector store**: Upstash Vector
- **Evals**: Braintrust
- **Web search**: Tavily

Everything runs locally. No deployment, no production cloud infrastructure.
