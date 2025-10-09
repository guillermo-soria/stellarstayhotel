import { PaymentPort, PaymentRequest, PaymentResult, PaymentMethod } from '../../application/ports/secondary-ports';
import { logger } from '../logger';

/**
 * Stubbed Payment Adapter for development
 * In production, this would integrate with real payment processors
 * like Stripe, PayPal, or bank APIs
 */
export class StubbedPaymentAdapter implements PaymentPort {
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    logger.info(`Processing payment (stubbed) - Amount: ${request.amount} ${request.currency}, Method: ${request.paymentMethod.type}`);

    // Simulate processing delay
    await this.simulateDelay(500);

    // Simulate different payment outcomes
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      return {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'success',
        message: 'Payment processed successfully'
      };
    } else {
      return {
        transactionId: `failed_${Date.now()}`,
        status: 'failed',
        message: 'Payment failed',
        failureReason: 'Insufficient funds'
      };
    }
  }

  async validatePaymentMethod(method: PaymentMethod): Promise<boolean> {
    logger.info({ type: method.type }, 'Validating payment method (stubbed)');
    
    // Simulate validation delay
    await this.simulateDelay(200);
    
    // All payment methods are valid in stub
    return true;
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    logger.info({ transactionId, amount }, 'Processing refund (stubbed)');
    
    await this.simulateDelay(300);
    
    return {
      transactionId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success',
      message: 'Refund processed successfully'
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
