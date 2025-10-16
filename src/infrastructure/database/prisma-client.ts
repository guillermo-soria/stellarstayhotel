import { PrismaClient } from '../../generated/prisma';
import { logger } from '../logger';

class PrismaClientSingleton {
  private static instance: PrismaClient;
  private static handlersInstalled = false;

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });

      // Install once-only signal handlers for graceful shutdown. Using signal handlers
      // avoids disconnection loops when process managers/watchers restart the process.
      if (!PrismaClientSingleton.handlersInstalled) {
        const install = () => {
          const handle = (signal: NodeJS.Signals) => {
            void PrismaClientSingleton.instance.$disconnect()
              .then(() => logger.info('Prisma client disconnected'))
              .catch(err => logger.error({ err }, 'Error disconnecting Prisma client'))
              .finally(() => {
                // Re-emit the signal so tools like nodemon/ts-node-dev can perform their default behavior
                try { process.kill(process.pid, signal); } catch (_) { /* ignore */ }
              });
          };

          ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(sig => {
            // use once to avoid duplicate handlers on restarts
            process.once(sig as NodeJS.Signals, () => handle(sig as NodeJS.Signals));
          });

          PrismaClientSingleton.handlersInstalled = true;
        };

        install();
      }
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
