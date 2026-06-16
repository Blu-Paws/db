export interface VIEW_LOGIN {
    login_id: number;
    email: string;
    name: string;
    status: number;
    phone: string;
    login_status_id: number;
    created_by: number;
    create_date: string;
    module_id: number;
    country_code: string;
    force_change_password?: number;
    password?: string;
}
