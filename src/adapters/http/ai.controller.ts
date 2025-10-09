import { Router, Request, Response } from 'express';
import { OllamaAdapter } from '../../infrastructure/adapters/ollama.adapter';
import { QueryProcessor, RoomProvider } from '../../domain/services/query-processor';
import { ProcessAIQueryUseCase } from '../../application/use-cases/process-ai-query';

// Dummy room provider for demonstration. Replace with real implementation.
const roomProvider: RoomProvider = {
  async findAvailableRooms(params) {
    // Return mock data or integrate with your actual room service/repository
    return [
      { roomId: '101', type: 'king', price: 180, features: ['breakfast', 'quiet'] },
      { roomId: '202', type: 'junior', price: 120, features: ['city view'] }
    ];
  }
};

const llmClient = new OllamaAdapter();
const queryProcessor = new QueryProcessor(llmClient, roomProvider);
const useCase = new ProcessAIQueryUseCase(queryProcessor);

const router = Router();

router.post('/api/ai/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const result = await useCase.execute(query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
