export interface VIEW_PROMOTION {
  promotion_id: number;
  promotion_code: string;
  title: string;
  description: string;
  clinic_id: number;
  discount_type: string;
  discount_value: number;
  percentage: number;
  source: string;
  promotion_start_date: string;
  promotion_end_date: string;
  usage_limit: number;
  per_user_limit: number;
  status: number;
  created_by: number;
  create_date: string;
}
