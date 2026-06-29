export interface VIEW_PROVIDER_SCHEDULES {
    id: number;
    user_id: number;
    clinic_id: number;
    entity_type: string;
    entity_id: number;
    rule_type: string;
    exception_start_date: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    timezone: string;
    is_available: number;
    is_active: number;
}
