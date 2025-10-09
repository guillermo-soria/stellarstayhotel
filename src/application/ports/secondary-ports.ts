// Secondary Ports (Outgoing interfaces)

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  metadata: Record<string, any>;
}

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  details: Record<string, any>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  failureReason?: string;
}

export interface PricingRules {
  baseRates: Record<string, number>;
  weekendUpliftPercent: number;
  lengthDiscounts: {
    nights: number;
    discountCents: number;
  }[];
  breakfastPricePerGuest: number;
}

export interface RoomConfig {
  roomTypes: {
    type: string;
    capacity: number;
    amenities: string[];
  }[];
  availabilitySettings: {
    maxAdvanceBookingDays: number;
    minBookingNoticeDays: number;
  };
}

// Secondary Ports (Outgoing)
export interface PaymentPort {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  validatePaymentMethod(method: PaymentMethod): Promise<boolean>;
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResult>;
}

export interface ConfigurationPort {
  getPricingRules(): Promise<PricingRules>;
  getRoomConfiguration(): Promise<RoomConfig>;
  updatePricingRules(rules: Partial<PricingRules>): Promise<void>;
}

export interface NotificationPort {
  sendReservationConfirmation(reservationId: string, email: string): Promise<void>;
  sendReservationCancellation(reservationId: string, email: string): Promise<void>;
  sendPaymentFailureNotification(reservationId: string, email: string): Promise<void>;
}

export interface AuditPort {
  logReservationEvent(event: ReservationAuditEvent): Promise<void>;
  logPricingCalculation(calculation: PricingAuditEvent): Promise<void>;
}

export interface ReservationAuditEvent {
  reservationId: string;
  eventType: 'created' | 'modified' | 'cancelled';
  userId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface PricingAuditEvent {
  calculationId: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  totalCents: number;
  rulesApplied: string[];
  timestamp: Date;
}
