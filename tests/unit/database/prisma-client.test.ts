describe('PrismaClientSingleton', () => {
  let $connectMock: jest.Mock;
  let $disconnectMock: jest.Mock;
  let PrismaClientSingleton: any;

  beforeEach(() => {
    $connectMock = jest.fn().mockResolvedValue(undefined);
    $disconnectMock = jest.fn().mockResolvedValue(undefined);
    jest.resetModules();
    jest.doMock('../../../src/generated/prisma', () => ({
      PrismaClient: jest.fn().mockImplementation(() => ({
        $connect: $connectMock,
        $disconnect: $disconnectMock,
      }))
    }));
    PrismaClientSingleton = require('../../../src/infrastructure/database/prisma-client').PrismaClientSingleton;
    PrismaClientSingleton.instance = undefined;
  });

  afterEach(() => {
    PrismaClientSingleton.instance = undefined;
    jest.resetModules();
  });

  it('should create a singleton instance', () => {
    const client1 = PrismaClientSingleton.getInstance();
    const client2 = PrismaClientSingleton.getInstance();
    expect(client1).toBe(client2);
  });

  it('should connect successfully', async () => {
    await expect(PrismaClientSingleton.connect()).resolves.toBeUndefined();
    expect($connectMock).toHaveBeenCalled();
  });

  it('should disconnect successfully', async () => {
    await PrismaClientSingleton.connect();
    await expect(PrismaClientSingleton.disconnect()).resolves.toBeUndefined();
    expect($disconnectMock).toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    const error = new Error('fail connect');
    $connectMock.mockRejectedValueOnce(error);
    await expect(PrismaClientSingleton.connect()).rejects.toThrow('fail connect');
  });
});
