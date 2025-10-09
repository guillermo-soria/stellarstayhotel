import { PrismaClient } from '../../generated/prisma';
import { logger } from '../logger';

class PrismaClientSingleton {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaClientSingleton.instance.$disconnect();
        logger.info('Prisma client disconnected');
      });
    }

    return PrismaClientSingleton.instance;
  }

  public static async connect(): Promise<void> {
    try {
      const client = PrismaClientSingleton.getInstance();
      await client.$connect();
      logger.info('Prisma client connected successfully');
    } catch (error) {
      logger.error(`Failed to connect Prisma client: ${error}`);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
      logger.info('Prisma client disconnected');
    }
  }
}

export const prismaClient = PrismaClientSingleton.getInstance();
export { PrismaClientSingleton };
