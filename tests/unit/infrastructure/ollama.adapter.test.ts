import axios from 'axios';
import { OllamaAdapter } from '../../../src/infrastructure/adapters/ollama.adapter';

describe('OllamaAdapter', () => {
  it('should call Ollama API and return LLMResponse', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        response: 'AI text',
        model: 'llama3.2:3b',
        total_duration: 100,
        load_duration: 10
      }
    });
    const adapter = new OllamaAdapter('http://localhost:11434');
    const result = await adapter.generate('Prompt');
    expect(result.text).toBe('AI text');
    expect(result.metadata.model).toBe('llama3.2:3b');
    expect(result.metadata.total_duration).toBe(100);
    expect(result.metadata.load_duration).toBe(10);
  });

  it('should throw error on API failure', async () => {
    jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('fail'));
    const adapter = new OllamaAdapter('http://localhost:11434');
    await expect(adapter.generate('Prompt')).rejects.toThrow('Ollama API error: fail');
  });
});
