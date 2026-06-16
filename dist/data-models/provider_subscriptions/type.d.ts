export interface VIEW_PROVIDER_SUBSCRIPTIONS {
    subscription_id: number;
    clinic_id: number;
    plan_id: number;
    start_date: string;
    end_date: string;
    status: number;
    period: string;
    razorpay_subscription_id: string;
    stripe_subscription_id: string;
    order_id: string;
    payment_id: string;
}
