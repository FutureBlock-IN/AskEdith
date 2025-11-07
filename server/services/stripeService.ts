import Stripe from "stripe";
import { storage } from "../storage";
import type { ExpertVerification, Appointment } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export interface CreateConnectAccountResult {
  accountId: string;
  accountLink?: string;
  requiresAction: boolean;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  applicationFeeAmount: number;
}

export interface PayoutInfo {
  totalEarnings: number;
  pendingPayouts: number;
  availableBalance: number;
  lastPayoutDate?: Date;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create Stripe Connect Express account for expert
   */
  async createConnectAccount(
    expertId: string,
    email: string,
    refreshUrl?: string,
    returnUrl?: string,
  ): Promise<CreateConnectAccountResult> {
    try {
      // Check if expert already has a Connect account
      const expert = await storage.getExpertVerification(expertId);
      if (!expert) {
        throw new Error("Expert verification not found");
      }

      if (expert.stripeConnectAccountId) {
        // Return existing account
        return {
          accountId: expert.stripeConnectAccountId,
          requiresAction: false,
        };
      }

      // Create new Express account
      const account = await this.stripe.accounts.create({
        type: "express",
        country: "US",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual", // Most experts will be individuals
        metadata: {
          expertId,
          platform: "CaregiversCommunity",
        },
      });

      // Update expert with Connect account ID
      await storage.updateExpertVerification(expert.id, {
        stripeConnectAccountId: account.id,
      });

      // Create account link for onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url:
          refreshUrl || `${process.env.CLIENT_URL}/expert/stripe/refresh`,
        return_url:
          returnUrl || `${process.env.CLIENT_URL}/expert/stripe/success`,
        type: "account_onboarding",
      });

      return {
        accountId: account.id,
        accountLink: accountLink.url,
        requiresAction: true,
      };
    } catch (error) {
      console.error("Error creating Connect account:", error);
      throw new Error("Failed to create Stripe Connect account");
    }
  }

  /**
   * Get Connect account status and requirements
   */
  async getConnectAccountStatus(accountId: string): Promise<{
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: string[];
  }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        requirements: account.requirements?.currently_due || [],
      };
    } catch (error) {
      console.error("Error getting Connect account status:", error);
      throw new Error("Failed to get account status");
    }
  }

  /**
   * Create payment intent for consultation booking with automatic fee splitting
   */
  async createConsultationPaymentIntent(consultation: {
    expertId: string;
    totalAmount: number; // in cents
    duration: number;
    clientId: string;
  }): Promise<PaymentIntentResult> {
    try {
      // Get expert's Connect account
      const expert = await storage.getExpertVerification(consultation.expertId);
      if (!expert || !expert.stripeConnectAccountId) {
        throw new Error("Expert must set up payment processing first");
      }

      // Calculate platform fee (15%)
      const platformFeeAmount = Math.round(consultation.totalAmount * 0.15);

      // Create payment intent with Connect account
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: consultation.totalAmount,
        currency: "usd",
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: expert.stripeConnectAccountId,
        },
        metadata: {
          type: "consultation_booking",
          expertId: consultation.expertId,
          clientId: consultation.clientId,
          duration: consultation.duration.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        applicationFeeAmount: platformFeeAmount,
      };
    } catch (error) {
      console.error("Error creating consultation payment intent:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  /**
   * Create payment intent for appointment booking with automatic fee splitting
   */
  async createAppointmentPaymentIntent(appointment: {
    expertId: string;
    totalAmount: number; // in cents
    duration: number;
    clientEmail: string;
    appointmentId?: number;
  }): Promise<PaymentIntentResult> {
    try {
      // Get expert's Connect account
      const expert = await storage.getExpertVerification(appointment.expertId);
      if (!expert || !expert.stripeConnectAccountId) {
        throw new Error("Expert must set up payment processing first");
      }

      // Calculate platform fee (10%)
      const platformFeeAmount = Math.round(appointment.totalAmount * 0.1);

      // Create payment intent with Connect account
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: appointment.totalAmount,
        currency: "usd",
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: expert.stripeConnectAccountId,
        },
        metadata: {
          type: "appointment_booking",
          expertId: appointment.expertId,
          clientEmail: appointment.clientEmail,
          duration: appointment.duration.toString(),
          appointmentId: appointment.appointmentId?.toString() || "pending",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        applicationFeeAmount: platformFeeAmount,
      };
    } catch (error) {
      console.error("Error creating appointment payment intent:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  /**
   * Process refund for cancelled appointment
   */
  async refundAppointment(
    paymentIntentId: string,
    refundAmount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount, // If not specified, refunds full amount
        reason:
          (reason as Stripe.RefundCreateParams.Reason) ||
          "requested_by_customer",
        refund_application_fee: true, // Also refund platform fee
        reverse_transfer: true, // Reverse the transfer to expert
      });

      return refund;
    } catch (error) {
      console.error("Error processing refund:", error);
      throw new Error("Failed to process refund");
    }
  }

  /**
   * Get expert's earnings and payout information
   */
  async getExpertPayoutInfo(expertId: string): Promise<PayoutInfo> {
    try {
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || !expert.stripeConnectAccountId) {
        throw new Error("Expert does not have payment processing set up");
      }

      // Get account balance
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: expert.stripeConnectAccountId,
      });

      // Get recent payouts
      const payouts = await this.stripe.payouts.list(
        { limit: 1 },
        { stripeAccount: expert.stripeConnectAccountId },
      );

      // Calculate totals
      const availableBalance = balance.available.reduce(
        (sum, bal) => sum + bal.amount,
        0,
      );
      const pendingPayouts = balance.pending.reduce(
        (sum, bal) => sum + bal.amount,
        0,
      );

      // Get total earnings from completed appointments
      const appointments = await storage.getExpertAppointments(expertId);
      const completedAppointments = appointments.filter(
        (apt) => apt.status === "completed",
      );
      const totalEarnings = completedAppointments.reduce(
        (sum, apt) => sum + apt.expertEarnings,
        0,
      );

      return {
        totalEarnings,
        pendingPayouts,
        availableBalance,
        lastPayoutDate: payouts.data[0]?.arrival_date
          ? new Date(payouts.data[0].arrival_date * 1000)
          : undefined,
      };
    } catch (error) {
      console.error("Error getting expert payout info:", error);
      throw new Error("Failed to get payout information");
    }
  }

  /**
   * Create instant payout for expert
   */
  async createInstantPayout(
    expertId: string,
    amount: number, // in cents
  ): Promise<Stripe.Payout> {
    try {
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || !expert.stripeConnectAccountId) {
        throw new Error("Expert does not have payment processing set up");
      }

      const payout = await this.stripe.payouts.create(
        {
          amount,
          currency: "usd",
          method: "instant",
        },
        { stripeAccount: expert.stripeConnectAccountId },
      );

      return payout;
    } catch (error) {
      console.error("Error creating instant payout:", error);
      throw new Error("Failed to create instant payout");
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case "account.updated":
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case "transfer.created":
          await this.handleTransferCreated(
            event.data.object as Stripe.Transfer,
          );
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const appointmentId = paymentIntent.metadata.appointmentId;

    if (appointmentId && appointmentId !== "pending") {
      // Update appointment status to confirmed
      await storage.updateAppointmentStatus(
        parseInt(appointmentId),
        "confirmed",
      );

      // TODO: Send confirmation emails/notifications
      console.log(`Payment succeeded for appointment ${appointmentId}`);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const appointmentId = paymentIntent.metadata.appointmentId;

    if (appointmentId && appointmentId !== "pending") {
      // Update appointment status to cancelled
      await storage.updateAppointmentStatus(
        parseInt(appointmentId),
        "cancelled",
      );

      // TODO: Send failure notifications
      console.log(`Payment failed for appointment ${appointmentId}`);
    }
  }

  /**
   * Handle Connect account updates
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    // Find expert by Connect account ID
    const expertId = account.metadata?.expertId;

    if (expertId) {
      // Update expert verification status based on account capabilities
      const expert = await storage.getExpertVerification(expertId);
      if (expert) {
        const canAcceptPayments =
          account.charges_enabled && account.payouts_enabled;

        // You might want to update expert status or send notifications
        console.log(
          `Connect account ${account.id} updated. Can accept payments: ${canAcceptPayments}`,
        );
      }
    }
  }

  /**
   * Handle transfer creation (when money is sent to expert)
   */
  private async handleTransferCreated(
    transfer: Stripe.Transfer,
  ): Promise<void> {
    console.log(
      `Transfer created: ${transfer.id} for ${transfer.amount} cents`,
    );
    // TODO: Update expert earnings tracking, send notifications
  }

  /**
   * Get Connect account dashboard link
   */
  async getConnectDashboardLink(expertId: string): Promise<string> {
    try {
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || !expert.stripeConnectAccountId) {
        throw new Error("Expert does not have payment processing set up");
      }

      const loginLink = await this.stripe.accounts.createLoginLink(
        expert.stripeConnectAccountId,
      );
      return loginLink.url;
    } catch (error) {
      console.error("Error creating dashboard link:", error);
      throw new Error("Failed to create dashboard link");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      throw new Error("Invalid webhook signature");
    }
  }
}

export const stripeService = new StripeService();
