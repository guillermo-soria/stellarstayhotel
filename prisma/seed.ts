import { PrismaClient } from '../src/generated/prisma';
import { logger } from '../src/infrastructure/logger';

const prisma = new PrismaClient();

const SEED_ROOMS = [
  { id: "room-001", type: "junior", capacity: 2, baseRate: 6000 },
  { id: "room-002", type: "junior", capacity: 2, baseRate: 6000 },
  { id: "room-003", type: "king", capacity: 3, baseRate: 9000 },
  { id: "room-004", type: "king", capacity: 3, baseRate: 9000 },
  { id: "room-005", type: "king", capacity: 4, baseRate: 9000 },
  { id: "room-006", type: "presidential", capacity: 6, baseRate: 15000 },
];

async function main() {
  try {
    logger.info('Starting database seed...');

    // Clear existing data
    await prisma.reservation.deleteMany();
    await prisma.room.deleteMany();

    // Insert rooms
    for (const room of SEED_ROOMS) {
      await prisma.room.create({
        data: {
          ...room,
          isActive: true
        }
      });
      logger.info(`Created room ${room.id} (${room.type})`);
    }

    logger.info(`Seeded ${SEED_ROOMS.length} rooms successfully`);
  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      logger.info('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Database seeding failed');
      process.exit(1);
    });
}

export { main as seedDatabase };
