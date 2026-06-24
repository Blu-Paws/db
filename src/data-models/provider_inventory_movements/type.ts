export interface VIEW_PROVIDER_INVENTORY_MOVEMENTS {
  movement_id: number;
  clinic_id: number;
  variant_id: number;
  location_id: number;
  from_location_id: number;
  to_location_id: number;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  inventory_batch_id: number;
  reference_type: string;
  reference_id: number;
  reference_no: string;
  paired_movement_id: number;
  notes: string;
  created_by: number;
  created_date: string;
}
