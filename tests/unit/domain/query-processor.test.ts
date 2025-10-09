import { QueryProcessor, RoomProvider, RoomQueryParams } from '../../../src/domain/services/query-processor';
import { LLMPort, LLMResponse } from '../../../src/application/ports/llm.port';

describe('QueryProcessor', () => {
  const mockLLM: jest.Mocked<LLMPort> = {
    generate: jest.fn()
  };

  const mockRoomProvider: RoomProvider = {
    findAvailableRooms: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process a query and return results', async () => {
    const params: RoomQueryParams = {
      check_in_date: '2025-12-01',
      num_guests: 2,
      room_type: 'king',
      max_price: 200,
      breakfast_included: true
    };
    mockLLM.generate
      .mockResolvedValueOnce({ text: JSON.stringify(params), metadata: {} })
      .mockResolvedValueOnce({ text: 'Here are your results!', metadata: {} });
    (mockRoomProvider.findAvailableRooms as jest.Mock).mockResolvedValue([
      { roomId: '101', type: 'king', price: 180, features: ['breakfast', 'quiet'] }
    ]);
    const processor = new QueryProcessor(mockLLM, mockRoomProvider);
    const result = await processor.processQuery('Find a king room for 2 guests under $200 with breakfast');
    expect(result.extracted_parameters).toEqual(params);
    expect(result.structured_results.length).toBe(1);
    expect(result.natural_language_response).toBe('Here are your results!');
  });

  it('should throw if LLM response is not valid JSON', async () => {
    mockLLM.generate.mockResolvedValueOnce({ text: 'not json', metadata: {} });
    const processor = new QueryProcessor(mockLLM, mockRoomProvider);
    await expect(processor.processQuery('bad query')).rejects.toThrow('Failed to parse LLM response as JSON');
  });

  it('should handle empty room results', async () => {
    const params: RoomQueryParams = {
      check_in_date: '2025-12-01',
      num_guests: 2
    };
    mockLLM.generate
      .mockResolvedValueOnce({ text: JSON.stringify(params), metadata: {} })
      .mockResolvedValueOnce({ text: 'No rooms found.', metadata: {} });
    (mockRoomProvider.findAvailableRooms as jest.Mock).mockResolvedValue([]);
    const processor = new QueryProcessor(mockLLM, mockRoomProvider);
    const result = await processor.processQuery('Find a room');
    expect(result.structured_results).toEqual([]);
    expect(result.natural_language_response).toBe('No rooms found.');
  });
});
