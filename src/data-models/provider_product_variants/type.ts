export interface VIEW_PROVIDER_PRODUCT_VARIANTS {
  variant_id: number;
  product_id: number;
  sku: string;
  barcode: string;
  variant_code: string;
  variant_name: string;
  unit_of_measure: string;
  package_size: number;
  package_unit: string;
  cost_price: number;
  sale_price: number;
  mrp: number;
  reorder_level: number;
  reorder_quantity: number;
  track_batch: number;
  track_expiry: number;
  sort_order: number;
  status: number;
  created_by: number;
  updated_by: number;
  created_date: string;
  updated_date: string;
}
