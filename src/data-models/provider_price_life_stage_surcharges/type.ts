export interface VIEW_PROVIDER_PRICE_LIFE_STAGE_SURCHARGES {
  id: number;
  clinic_id: number;
  entity_type: string;
  entity_id: string;
  name: string;
  min_age_years: number;
  max_age_years: number;
  adjustment: number;
  sort_order: number;
}
