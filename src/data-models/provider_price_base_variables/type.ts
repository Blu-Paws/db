export interface VIEW_PROVIDER_PRICE_BASE_VARIABLES {
  id: number;
  clinic_id: number;
  entity_type: string;
  entity_id: string;
  pet_type_id: number;
  name: string;
  min_weight: number;
  max_weight: number;
  adjustment: number;
  sort_order: number;
}
