import { ProcessAIQueryUseCase } from '../../../src/application/use-cases/process-ai-query';

describe('ProcessAIQueryUseCase', () => {
  it('should execute and return result from QueryProcessor', async () => {
    const mockProcessor = {
      processQuery: jest.fn().mockResolvedValue({
        natural_language_response: 'AI response',
        structured_results: [{ roomId: '101' }],
        extracted_parameters: { check_in_date: '2025-12-01', num_guests: 2 }
      })
    };
    const useCase = new ProcessAIQueryUseCase(mockProcessor as any);
    const result = await useCase.execute('Find a room');
    expect(result.natural_language_response).toBe('AI response');
    expect(result.structured_results.length).toBe(1);
    expect(result.extracted_parameters.check_in_date).toBe('2025-12-01');
    expect(mockProcessor.processQuery).toHaveBeenCalledWith('Find a room');
  });
});
