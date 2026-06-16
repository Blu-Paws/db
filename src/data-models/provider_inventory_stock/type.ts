export interface VIEW_PROVIDER_INVENTORY_STOCK {
  stock_id: number;
  clinic_id: number;
  variant_id: number;
  location_id: number;
  batch_id: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  last_counted_date: string;
  last_movement_date: string;
  status: number;
  created_by: number;
  updated_by: number;
  created_date: string;
  updated_date: string;
}
