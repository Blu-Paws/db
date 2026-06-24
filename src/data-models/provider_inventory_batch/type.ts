export interface VIEW_PROVIDER_INVENTORY_BATCH {
  inventory_batch_id: number;
  clinic_id: number;
  variant_id: number;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  purchase_cost: number;
  status: number;
  created_by: number;
  created_date: string;
}
