export interface VIEW_PROVIDER_VISIT_CONSUMPTIONS {
  visit_consumption_id: number;
  clinic_id: number;
  evisit_id: number;
  variant_id: number;
  location_id: number;
  inventory_batch_id: number;
  quantity: number;
  created_by: number;
  create_date: string;
  sku: string;
  variant_code: string;
  variant_name: string;
  unit_of_measure: string;
  product_id: number;
  product_code: string;
  product_name: string;
  location_code: string;
  location_name: string;
  location_type: string;
  full_path_code: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  purchase_cost: number;
}
