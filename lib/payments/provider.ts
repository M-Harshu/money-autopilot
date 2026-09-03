export type PaymentOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
};

export interface PaymentProvider {
  createOrder(
    amount: number,
    receipt: string,
  ): Promise<PaymentOrder>;

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean;
}