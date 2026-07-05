export interface VIEW_INTEGRATOR_BOOKINGS {
  id: number;
  integrator_id: number;
  clinic_id: number;
  integrator_booking_id: string;
  integrator_customer_id: string;
  customer_id: string;
  evisit_id: string;
  assigned_id: string;
  integrator_assigned_id: string;
  integrator_status: string;
  square_version: number;
  created_at: string;
  updated_at: string;
  sync_status: string;
  last_sync_error: string;
}
