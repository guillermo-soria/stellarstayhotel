// Mock the external dependencies before any imports
const mockCreateReservation = {
  execute: jest.fn()
};

jest.mock('../../../src/infrastructure/repositories/new-in-memory-reservation.repository', () => ({
  NewInMemoryReservationRepository: jest.fn()
}));

jest.mock('../../../src/infrastructure/repositories/new-in-memory-room.repository', () => ({
  NewInMemoryRoomRepository: jest.fn()
}));

jest.mock('../../../src/application/use-cases/new-create-reservation', () => ({
  CreateReservation: jest.fn().mockImplementation(() => mockCreateReservation)
}));

jest.mock('../../../src/domain/services/pricing-engine', () => ({
  PricingEngine: jest.fn()
}));

import { createReservationController } from '../../../src/adapters/http/controllers/reservations.controller';
import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include validatedBody
interface MockRequest extends Partial<Request> {
  validatedBody?: any;
  header?: jest.Mock;
}

// Extend Error interface to include code property
interface ErrorWithCode extends Error {
  code?: string;
}

describe('createReservationController', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      validatedBody: {
        roomId: 'r-101',
        type: 'junior',
        checkIn: '2024-12-01',
        checkOut: '2024-12-03',
        guests: 2,
        breakfast: false
      },
      header: jest.fn().mockReturnValue('test-idempotency-key')
    };
    
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new reservation successfully', async () => {
    const mockReservation = {
      id: 'res-123',
      roomId: 'r-101',
      checkIn: new Date('2024-12-01'),
      checkOut: new Date('2024-12-03'),
      guests: 2,
      breakfast: false,
      totalCents: 12000,
      status: 'CONFIRMED',
      createdAt: new Date('2024-11-01'),
      idempotencyKey: 'test-idempotency-key'
    };

    mockCreateReservation.execute.mockResolvedValue({
      reservation: mockReservation,
      created: true
    });

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      id: 'res-123',
      status: 'CONFIRMED',
      totalCents: 12000,
      createdAt: mockReservation.createdAt,
      requestIdempotencyKey: 'test-idempotency-key'
    });
  });

  it('should return existing reservation for duplicate idempotency key', async () => {
    const mockReservation = {
      id: 'res-123',
      roomId: 'r-101',
      checkIn: new Date('2024-12-01'),
      checkOut: new Date('2024-12-03'),
      guests: 2,
      breakfast: false,
      totalCents: 12000,
      status: 'CONFIRMED',
      createdAt: new Date('2024-11-01'),
      idempotencyKey: 'test-idempotency-key'
    };

    mockCreateReservation.execute.mockResolvedValue({
      reservation: mockReservation,
      created: false
    });

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      id: 'res-123',
      status: 'CONFIRMED',
      totalCents: 12000,
      createdAt: mockReservation.createdAt,
      requestIdempotencyKey: 'test-idempotency-key'
    });
  });

  it('should return 400 when idempotency key is missing', async () => {
    mockRequest.header = jest.fn().mockReturnValue(undefined);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Header Idempotency-Key requerido'
      }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle ROOM_NOT_FOUND error', async () => {
    const error: ErrorWithCode = new Error('Room not found');
    error.code = 'ROOM_NOT_FOUND';

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room no encontrada'
      }
    });
  });

  it('should handle ROOM_TYPE_MISMATCH error', async () => {
    const error: ErrorWithCode = new Error('Room type mismatch');
    error.code = 'ROOM_TYPE_MISMATCH';

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'ROOM_TYPE_MISMATCH',
        message: 'Tipo de room no coincide'
      }
    });
  });

  it('should handle OVER_CAPACITY error', async () => {
    const error: ErrorWithCode = new Error('Over capacity');
    error.code = 'OVER_CAPACITY';

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'OVER_CAPACITY',
        message: 'Guests exceden capacidad'
      }
    });
  });

  it('should handle INVALID_RANGE error', async () => {
    const error: ErrorWithCode = new Error('Invalid date range');
    error.code = 'INVALID_RANGE';

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_RANGE',
        message: 'Rango de fechas inválido'
      }
    });
  });

  it('should handle DATE_OVERLAP error', async () => {
    const error: ErrorWithCode = new Error('Room unavailable');
    error.code = 'DATE_OVERLAP';

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'DATE_OVERLAP',
        message: 'Fechas solapadas con otra reserva'
      }
    });
  });

  it('should handle unknown errors by calling next', async () => {
    const error = new Error('Unknown error');

    mockCreateReservation.execute.mockRejectedValue(error);

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should pass correct parameters to use case', async () => {
    mockRequest.validatedBody = {
      roomId: 'r-201',
      type: 'king',
      checkIn: '2024-12-05',
      checkOut: '2024-12-10',
      guests: 3,
      breakfast: true
    };

    mockCreateReservation.execute.mockResolvedValue({
      reservation: { id: 'res-456' },
      isNewReservation: true
    });

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockCreateReservation.execute).toHaveBeenCalledWith({
      roomId: 'r-201',
      type: 'king',
      checkIn: new Date('2024-12-05'),
      checkOut: new Date('2024-12-10'),
      guests: 3,
      breakfast: true,
      idempotencyKey: 'test-idempotency-key'
    });
  });

  it('should handle missing breakfast field as false', async () => {
    mockRequest.validatedBody = {
      roomId: 'r-101',
      type: 'junior',
      checkIn: '2024-12-01',
      checkOut: '2024-12-03',
      guests: 2
      // breakfast field is missing
    };

    mockCreateReservation.execute.mockResolvedValue({
      reservation: { id: 'res-789' },
      isNewReservation: true
    });

    await createReservationController(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockCreateReservation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        breakfast: false
      })
    );
  });
});
