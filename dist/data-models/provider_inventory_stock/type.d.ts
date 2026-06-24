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
}
