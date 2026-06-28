export interface VIEW_PROVIDER_INVENTORY_STOCK {
    stock_id: number;
    clinic_id: number;
    variant_id: number;
    location_id: number;
    inventory_batch_id: number;
    quantity_on_hand: number;
    reserved_quantity: number;
    created_by: number;
    updated_by: number;
    created_date: string;
    updated_date: string;
    available_quantity: number;
    variant_code: string;
    variant_name: string;
    sku: string;
    product_id: number;
    product_code: string;
    product_name: string;
    location_code: string;
    location_name: string;
    location_type: string;
    full_path_code: string;
    batch_number: string;
    manufacture_date: string;
    expiry_date: string;
    purchase_cost: number;
}
