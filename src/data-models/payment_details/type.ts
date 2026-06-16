export interface VIEW_PAYMENT_DETAILS {
  pay_id: number;
  description: string;
  visit_type_id: number;
  evisit_id: number;
  amount: number;
  paystatus_id: number;
  payment_date: string;
  promotion_id: number;
  promotion_amount: number;
  payment_id: string;
  payment_comments: string;
  paymenttype_id: number;
  order_id: string;
  tax: number;
  service_fee: number;
  discount: number;
  status: number;
  created_by: number;
  create_date: string;
  update_by: number;
  updated_date: string;
}
