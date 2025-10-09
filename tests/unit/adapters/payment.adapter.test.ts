import { StubbedPaymentAdapter } from '../../../src/infrastructure/adapters/payment.adapter';
import { PaymentRequest, PaymentMethod } from '../../../src/application/ports/secondary-ports';

describe('StubbedPaymentAdapter', () => {
  const adapter = new StubbedPaymentAdapter();

  it('should process payment and return success or failure', async () => {
    const request: PaymentRequest = {
      amount: 100,
      currency: 'USD',
      paymentMethod: { type: 'credit_card', details: {} },
      metadata: {}
    };
    const result = await adapter.processPayment(request);
    expect(['success', 'failed']).toContain(result.status);
    expect(result.transactionId).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it('should validate any payment method as true (stub)', async () => {
    const method: PaymentMethod = { type: 'paypal', details: {} };
    const isValid = await adapter.validatePaymentMethod(method);
    expect(isValid).toBe(true);
  });

  it('should process refund and return success', async () => {
    const result = await adapter.refundPayment('txn_12345', 50);
    expect(result.status).toBe('success');
    expect(result.transactionId).toMatch(/^refund_/);
    expect(result.message).toBe('Refund processed successfully');
  });
});
