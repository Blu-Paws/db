export interface VIEW_PROVIDER_SERVICE_CONSUMABLES {
  consumption_id: number;
  clinic_id: number;
  reference_type: string;
  reference_id: string;
  variant_id: number;
  sku: string;
  variant_name: string;
  product_name: string;
  product_id: number;
  image_path: string;
  quantity: number;
  is_optional: number;
  created_by: number;
  create_date: string;
}
