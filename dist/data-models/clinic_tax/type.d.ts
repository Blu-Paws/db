export interface VIEW_CLINIC_TAX {
    tax_id: number;
    clinic_id: number;
    tax_name: string;
    percentage: number;
    linked_tax_id: number;
    start_date: string;
    to_date: string;
    created_date: string;
    created_by: number;
    status: number;
}
