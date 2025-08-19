export const MODEL_INFO = {
  openai: {
    models: [
      { id: "gpt-5", name: "GPT-5", contextWindow: 272000 },
      { id: "gpt-5-mini", name: "GPT-5 Mini", contextWindow: 272000 },
      { id: "gpt-5-nano", name: "GPT-5 Nano", contextWindow: 272000 },
      { id: "gpt-5-chat-latest", name: "GPT-5 Chat Latest", contextWindow: 272000 },
      { id: "gpt-4o", name: "GPT-4 Optimized", contextWindow: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4 Optimized Mini", contextWindow: 128000 }
    ]
  },
  anthropic: {
    models: [
      { id: "claude-opus-4.1", name: "Claude Opus 4.1", contextWindow: 200000 },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000 },
      { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 200000 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextWindow: 200000 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000 }
    ]
  },
  google: {
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1048576 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1048576 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2097152 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1048576 }
    ]
  },
  perplexity: {
    models: [
      { id: "sonar", name: "Sonar (Llama 3.3 70B)", contextWindow: 127072 },
      { id: "sonar-pro", name: "Sonar Pro", contextWindow: 127072 },
      { id: "llama-3.1-sonar-large-128k-online", name: "Llama 3.1 Sonar Large Online", contextWindow: 127072 },
      { id: "llama-3.1-sonar-small-128k-online", name: "Llama 3.1 Sonar Small Online", contextWindow: 127072 }
    ]
  }
};