import { createReservationController } from '../../../src/adapters/http/controllers/reservations.controller';

// Simple mocks
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
};

describe('createReservationController (smoke)', () => {
  it('should return 400 when missing Idempotency-Key header', async () => {
    const req: any = {
      header: () => undefined,
      validatedBody: {
        roomId: 'room-001',
        type: 'junior',
        checkIn: new Date('2025-10-10').toISOString(),
        checkOut: new Date('2025-10-11').toISOString(),
        guests: 1,
        breakfast: false
      }
    };
    const res = makeRes();
    const next = jest.fn();

    await createReservationController(req as any, res as any, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });
});
