export interface VIEW_PROVIDER_INVENTORY_LOCATIONS {
    location_id: number;
    clinic_id: number;
    parent_location_id: number;
    location_code: string;
    location_name: string;
    location_type: string;
    full_path_code: string;
    is_stock_location: number;
    sort_order: number;
    status: number;
    created_by: number;
    updated_by: number;
    created_date: string;
    updated_date: string;
    clinic_key: number;
    parent_location_key: number;
}
