export interface VIEW_PROVIDER_INSPECTION_CHECKLIST_QUESTIONS {
    question_id: number;
    clinic_id: number;
    module_id: number;
    display_order: number;
    question: string;
    question_type: string;
    required: number;
    options: string;
    min: number;
    max: number;
    status: number;
    created_by: number;
    create_date: string;
    updated_by: number;
    update_date: string;
}
