import { LLMPort } from '../../application/ports/llm.port';

export interface RoomQueryParams {
  check_in_date: string;
  check_out_date?: string;
  num_guests: number;
  room_type?: string;
  max_price?: number;
  breakfast_included?: boolean;
}

export interface RoomProvider {
  findAvailableRooms(params: RoomQueryParams): Promise<any[]>;
}

export class QueryProcessor {
  constructor(private llmClient: LLMPort, private roomProvider: RoomProvider) {}

  async processQuery(userQuery: string): Promise<{ natural_language_response: string; structured_results: any[]; extracted_parameters: RoomQueryParams }> {
    // Step 1: Extract parameters using LLM
    const extractionPrompt = `Extract booking parameters from this query in JSON format:\nQuery: "${userQuery}"\nExtract these fields:\n- check_in_date (YYYY-MM-DD or \"today\"/\"tomorrow\")\n- check_out_date (YYYY-MM-DD or null)\n- num_guests (integer)\n- room_type (junior/king/presidential or null)\n- max_price (integer or null)\n- breakfast_included (true/false)\nReturn ONLY valid JSON, no other text.`;
    const llmResponse = await this.llmClient.generate(extractionPrompt);
    let params: RoomQueryParams;
    try {
      params = JSON.parse(llmResponse.text);
    } catch {
      throw new Error('Failed to parse LLM response as JSON');
    }
    // Step 2: Query room availability
    const rooms = await this.roomProvider.findAvailableRooms(params);
    // Step 3: Generate natural language response
    const responsePrompt = `Generate a friendly response for this hotel search:\nQuery: "${userQuery}"\nFound ${rooms.length} available rooms.\nTop results: ${JSON.stringify(rooms.slice(0, 3), null, 2)}\nRespond naturally, mentioning prices and key features.`;
    const finalResponse = await this.llmClient.generate(responsePrompt);
    return {
      natural_language_response: finalResponse.text,
      structured_results: rooms,
      extracted_parameters: params
    };
  }
}
