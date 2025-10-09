import { NewInMemoryRoomRepository } from '../../../src/infrastructure/repositories/new-in-memory-room.repository';
import { RoomType } from '../../../src/application/ports/room-repo.port';

describe('NewInMemoryRoomRepository', () => {
  let repository: NewInMemoryRoomRepository;

  // Helper function to create test dates
  const createDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00Z');
  
  beforeEach(() => {
    repository = new NewInMemoryRoomRepository();
  });

  describe('getById', () => {
    it('should return room when valid id is provided', async () => {
      const room = await repository.getById('r-101');
      
      expect(room).not.toBeNull();
      expect(room!.id).toBe('r-101');
      expect(room!.number).toBe('101');
      expect(room!.type).toBe('junior');
      expect(room!.capacity).toBe(2);
    });

    it('should return different room types correctly', async () => {
      const juniorRoom = await repository.getById('r-101');
      const kingRoom = await repository.getById('r-201');
      const presidentialRoom = await repository.getById('r-301');

      expect(juniorRoom!.type).toBe('junior');
      expect(juniorRoom!.capacity).toBe(2);

      expect(kingRoom!.type).toBe('king');
      expect(kingRoom!.capacity).toBe(3);

      expect(presidentialRoom!.type).toBe('presidential');
      expect(presidentialRoom!.capacity).toBe(5);
    });

    it('should return null when room does not exist', async () => {
      const room = await repository.getById('r-999');
      expect(room).toBeNull();
    });

    it('should return null for empty string id', async () => {
      const room = await repository.getById('');
      expect(room).toBeNull();
    });
  });

  describe('findAvailable', () => {
    describe('Basic filtering by capacity', () => {
      it('should return all rooms when guests <= minimum capacity', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1 
        });
        
        expect(result.items).toHaveLength(5);
        expect(result.nextCursor).toBeNull();
        expect(result.items.map(r => r.id)).toEqual(['r-101', 'r-102', 'r-201', 'r-202', 'r-301']);
      });

      it('should filter rooms by guest capacity', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 3 
        });
        
        // Should only return king (capacity 3) and presidential (capacity 5) rooms
        expect(result.items).toHaveLength(3);
        expect(result.items.map(r => r.id)).toEqual(['r-201', 'r-202', 'r-301']);
        expect(result.items.every(r => r.capacity >= 3)).toBe(true);
      });

      it('should return only presidential rooms for high guest count', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 5 
        });
        
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('r-301');
        expect(result.items[0].type).toBe('presidential');
      });

      it('should return empty array when no rooms can accommodate guests', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 10 
        });
        
        expect(result.items).toHaveLength(0);
        expect(result.nextCursor).toBeNull();
      });
    });

    describe('Filtering by room type', () => {
      it('should filter by junior room type', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          type: 'junior' as RoomType 
        });
        
        expect(result.items).toHaveLength(2);
        expect(result.items.every(r => r.type === 'junior')).toBe(true);
        expect(result.items.map(r => r.id)).toEqual(['r-101', 'r-102']);
      });

      it('should filter by king room type', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          type: 'king' as RoomType 
        });
        
        expect(result.items).toHaveLength(2);
        expect(result.items.every(r => r.type === 'king')).toBe(true);
        expect(result.items.map(r => r.id)).toEqual(['r-201', 'r-202']);
      });

      it('should filter by presidential room type', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          type: 'presidential' as RoomType 
        });
        
        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe('presidential');
        expect(result.items[0].id).toBe('r-301');
      });

      it('should respect both capacity and type filters', async () => {
        // Request junior room for 3 guests - should return empty since junior rooms have capacity 2
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 3, 
          type: 'junior' as RoomType 
        });
        
        expect(result.items).toHaveLength(0);
      });

      it('should return rooms when type and capacity match', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 3, 
          type: 'king' as RoomType 
        });
        
        expect(result.items).toHaveLength(2);
        expect(result.items.every(r => r.type === 'king' && r.capacity >= 3)).toBe(true);
      });
    });

    describe('Pagination with cursor', () => {
      it('should use default limit when not specified', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1 
        });
        
        // Should return all rooms since we have fewer than default limit (20)
        expect(result.items).toHaveLength(5);
        expect(result.nextCursor).toBeNull();
      });

      it('should limit results when limit is specified', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 2 
        });
        
        expect(result.items).toHaveLength(2);
        expect(result.items.map(r => r.id)).toEqual(['r-101', 'r-102']);
        expect(result.nextCursor).toBe('r-102'); // Should have cursor for next page
      });

      it('should return next page when cursor is provided', async () => {
        const firstPage = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 2 
        });
        expect(firstPage.nextCursor).toBe('r-102');

        const secondPage = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 2,
          cursor: firstPage.nextCursor! 
        });
        
        expect(secondPage.items).toHaveLength(2);
        expect(secondPage.items.map(r => r.id)).toEqual(['r-201', 'r-202']);
        expect(secondPage.nextCursor).toBe('r-202');
      });

      it('should return final page without cursor', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 2,
          cursor: 'r-202' 
        });
        
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('r-301');
        expect(result.nextCursor).toBeNull(); // No more pages
      });

      it('should handle cursor not found gracefully', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          cursor: 'r-999' // Non-existent cursor
        });
        
        // Should return all rooms since cursor not found
        expect(result.items).toHaveLength(5);
        expect(result.nextCursor).toBeNull();
      });

      it('should combine cursor with type filtering', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1,
          type: 'junior' as RoomType,
          limit: 1,
          cursor: 'r-101'
        });
        
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('r-102');
        expect(result.nextCursor).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle zero guests', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 0 
        });
        
        expect(result.items).toHaveLength(5); // All rooms should be available
        expect(result.nextCursor).toBeNull();
      });

      it('should handle negative guests', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: -1 
        });
        
        expect(result.items).toHaveLength(5); // All rooms should be available
        expect(result.nextCursor).toBeNull();
      });

      it('should handle limit of 0', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 0 
        });
        
        expect(result.items).toHaveLength(0);
        expect(result.nextCursor).toBeNull();
      });

      it('should handle very large limit', async () => {
        const result = await repository.findAvailable({ 
          checkIn: createDate('2024-12-01'),
          checkOut: createDate('2024-12-02'),
          guests: 1, 
          limit: 1000 
        });
        
        expect(result.items).toHaveLength(5);
        expect(result.nextCursor).toBeNull();
      });
    });
  });
});
