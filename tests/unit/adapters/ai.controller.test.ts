import request from 'supertest';
import express from 'express';
import aiController from '../../../src/adapters/http/ai.controller';

describe('aiController', () => {
  const app = express();
  app.use(express.json());
  app.use(aiController);

  it('should return 500 if query is missing', async () => {
    const res = await request(app).post('/api/ai/query').send({});
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('should return result for valid query', async () => {
    // Patch useCase to return a mock result
    const useCase = require('../../../src/application/use-cases/process-ai-query');
    useCase.ProcessAIQueryUseCase.prototype.execute = jest.fn().mockResolvedValue({
      natural_language_response: 'Mock response',
      structured_results: [{ roomId: '101' }],
      extracted_parameters: { check_in_date: '2025-12-01', num_guests: 2 }
    });
    const res = await request(app).post('/api/ai/query').send({ query: 'Find a room' });
    expect(res.status).toBe(200);
    expect(res.body.natural_language_response).toBe('Mock response');
    expect(res.body.structured_results.length).toBe(1);
    expect(res.body.extracted_parameters.check_in_date).toBe('2025-12-01');
  });
});
