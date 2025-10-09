import axios from 'axios';
import { LLMPort, LLMResponse } from '../../application/ports/llm.port';

export class OllamaAdapter implements LLMPort {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generate(prompt: string, model: string = 'llama3.2:3b'): Promise<LLMResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        options: { temperature: 0.7, top_p: 0.9 }
      });
      const data = response.data;
      return {
        text: data.response,
        metadata: {
          model: data.model,
          total_duration: data.total_duration,
          load_duration: data.load_duration
        }
      };
    } catch (e: any) {
      throw new Error(`Ollama API error: ${e.message}`);
    }
  }
}
