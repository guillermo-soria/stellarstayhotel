import { QueryProcessor } from '../../domain/services/query-processor';
import { LLMPort } from '../ports/llm.port';
import { RoomProvider } from '../../domain/services/query-processor';

export class ProcessAIQueryUseCase {
  constructor(private queryProcessor: QueryProcessor) {}

  async execute(userQuery: string): Promise<{ natural_language_response: string; structured_results: any[]; extracted_parameters: any }> {
    return await this.queryProcessor.processQuery(userQuery);
  }
}
