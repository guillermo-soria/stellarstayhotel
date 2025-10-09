// Availability Controller minimal test to avoid empty suite failure
import { getAvailableRoomsController } from '../../../src/adapters/http/controllers/availability.controller';

// Create simple mocks
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
};

describe('getAvailableRoomsController', () => {
  it('should respond with JSON structure (smoke test)', async () => {
    const req: any = {
      validatedQuery: {
        checkIn: new Date('2025-10-10'),
        checkOut: new Date('2025-10-12'),
        guests: 2,
        type: undefined,
        breakfast: false,
        breakdown: false
      }
    };
    const res = makeRes();
    const next = jest.fn();

    await getAvailableRoomsController(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('items');
    expect(Array.isArray(payload.items)).toBe(true);
  });
});
