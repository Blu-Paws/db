export interface VIEW_PROVIDER_PRODUCTS {
    product_id: number;
    clinic_id: number;
    category_id: number;
    product_code: string;
    product_name: string;
    description: string;
    brand_name: string;
    product_type: string;
    is_stock_tracked: number;
    is_restricted: number;
    requires_prescription: number;
    allow_negative_stock: number;
    tax_id: number;
    default_unit_of_measure: string;
    image_id: number;
    status: number;
    created_by: number;
    updated_by: number;
    created_date: string;
    updated_date: string;
    clinic_key: number;
}
