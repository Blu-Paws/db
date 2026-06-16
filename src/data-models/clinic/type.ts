export interface VIEW_CLINIC {
  clinic_id: number;
  name: string;
  clinic_status_id: number;
  status_name: string;
  location_coordinates: string;
  address1: string;
  address2: string;
  zipcode: number;
  phone: string;
  clinic_email: string;
  about_us: string;
  stripe_customer_id: string;
  country_code: 'US';
}
