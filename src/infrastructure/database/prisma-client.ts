import { PrismaClient } from '../../generated/prisma';
import { logger } from '../logger';

class PrismaClientSingleton {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });

      // Handle graceful shutdown (avoid async handler returning a promise)
      process.on('beforeExit', () => {
        void PrismaClientSingleton.instance.$disconnect()
          .then(() => logger.info('Prisma client disconnected'))
          .catch(err => logger.error({ err }, 'Error disconnecting Prisma client'));
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
      const err = error as Error;
      logger.error({ err }, 'Failed to connect Prisma client');
      throw err;
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
