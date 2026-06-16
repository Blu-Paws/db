export interface VIEW_BANK_ACCOUNTS {
    bank_id: number;
    clinic_id: number;
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    iban: string;
    swift_bic: string;
    ifsc_code: string;
    status: number;
    primary_account: number;
    created_by: number;
    updated_by: number;
    create_date: string;
    update_date: string;
}
