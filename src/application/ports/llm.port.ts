// Secondary Port: LLM (Large Language Model)

export interface LLMResponse {
  text: string;
  metadata: Record<string, any>;
}

export interface LLMPort {
  generate(prompt: string, model?: string): Promise<LLMResponse>;
}
