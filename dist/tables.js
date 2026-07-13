"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableDefinitions = void 0;
const address_1 = __importDefault(require("./data-models/address"));
const bank_accounts_1 = __importDefault(require("./data-models/bank_accounts"));
const bill_1 = __importDefault(require("./data-models/bill"));
const clinic_1 = __importDefault(require("./data-models/clinic"));
const clinic_activation_history_1 = __importDefault(require("./data-models/clinic_activation_history"));
const clinic_availability_1 = __importDefault(require("./data-models/clinic_availability"));
const clinic_branch_1 = __importDefault(require("./data-models/clinic_branch"));
const clinic_lead_1 = __importDefault(require("./data-models/clinic_lead"));
const clinic_licenses_1 = __importDefault(require("./data-models/clinic_licenses"));
const clinic_profiles_1 = __importDefault(require("./data-models/clinic_profiles"));
const clinic_speciality_option_pricing_1 = __importDefault(require("./data-models/clinic_speciality_option_pricing"));
const clinic_tax_1 = __importDefault(require("./data-models/clinic_tax"));
const evisit_details_1 = __importDefault(require("./data-models/evisit_details"));
const evisit_details_history_1 = __importDefault(require("./data-models/evisit_details_history"));
const evisit_details_notes_1 = __importDefault(require("./data-models/evisit_details_notes"));
const favourite_1 = __importDefault(require("./data-models/favourite"));
const feedback_1 = __importDefault(require("./data-models/feedback"));
const images_1 = __importDefault(require("./data-models/images"));
const integrator_bookings_1 = __importDefault(require("./data-models/integrator_bookings"));
const login_1 = __importDefault(require("./data-models/login"));
const mstr_product_categories_1 = __importDefault(require("./data-models/mstr_product_categories"));
const mstr_breed_1 = __importDefault(require("./data-models/mstr_breed"));
const mstr_coat_1 = __importDefault(require("./data-models/mstr_coat"));
const mstr_gender_1 = __importDefault(require("./data-models/mstr_gender"));
const mstr_pet_types_1 = __importDefault(require("./data-models/mstr_pet_types"));
const mstr_provider_product_channels_1 = __importDefault(require("./data-models/mstr_provider_product_channels"));
const mstr_provider_plan_features_1 = __importDefault(require("./data-models/mstr_provider_plan_features"));
const mstr_provider_plan_prices_1 = __importDefault(require("./data-models/mstr_provider_plan_prices"));
const mstr_provider_plans_1 = __importDefault(require("./data-models/mstr_provider_plans"));
const mstr_status_1 = __importDefault(require("./data-models/mstr_status"));
const otp_data_1 = __importDefault(require("./data-models/otp_data"));
const payment_details_1 = __importDefault(require("./data-models/payment_details"));
const payment_details_history_1 = __importDefault(require("./data-models/payment_details_history"));
const pet_history_1 = __importDefault(require("./data-models/pet_history"));
const pet_medical_history_1 = __importDefault(require("./data-models/pet_medical_history"));
const pet_vitals_1 = __importDefault(require("./data-models/pet_vitals"));
const pets_1 = __importDefault(require("./data-models/pets"));
const promotion_1 = __importDefault(require("./data-models/promotion"));
const promotion_rules_1 = __importDefault(require("./data-models/promotion_rules"));
const provider_boarding_prices_1 = __importDefault(require("./data-models/provider_boarding_prices"));
const provider_boardings_1 = __importDefault(require("./data-models/provider_boardings"));
const provider_experience_price_1 = __importDefault(require("./data-models/provider_experience_price"));
const provider_inspection_checklist_1 = __importDefault(require("./data-models/provider_inspection_checklist"));
const provider_inspection_checklist_questions_1 = __importDefault(require("./data-models/provider_inspection_checklist_questions"));
const provider_inventory_locations_1 = __importDefault(require("./data-models/provider_inventory_locations"));
const provider_inventory_movements_1 = __importDefault(require("./data-models/provider_inventory_movements"));
const provider_inventory_batch_1 = __importDefault(require("./data-models/provider_inventory_batch"));
const provider_inventory_stock_1 = __importDefault(require("./data-models/provider_inventory_stock"));
const provider_package_services_1 = __importDefault(require("./data-models/provider_package_services"));
const provider_packages_1 = __importDefault(require("./data-models/provider_packages"));
const provider_service_consumables_1 = __importDefault(require("./data-models/provider_service_consumables"));
const provider_product_channels_1 = __importDefault(require("./data-models/provider_product_channels"));
const provider_product_variants_1 = __importDefault(require("./data-models/provider_product_variants"));
const provider_products_1 = __importDefault(require("./data-models/provider_products"));
const provider_price_base_variables_1 = __importDefault(require("./data-models/provider_price_base_variables"));
const provider_price_coat_complexity_1 = __importDefault(require("./data-models/provider_price_coat_complexity"));
const provider_price_life_stage_surcharges_1 = __importDefault(require("./data-models/provider_price_life_stage_surcharges"));
const provider_price_specialist_surcharges_1 = __importDefault(require("./data-models/provider_price_specialist_surcharges"));
const provider_schedules_1 = __importDefault(require("./data-models/provider_schedules"));
const provider_subscriptions_1 = __importDefault(require("./data-models/provider_subscriptions"));
const provider_subscriptions_history_1 = __importDefault(require("./data-models/provider_subscriptions_history"));
const session_1 = __importDefault(require("./data-models/session"));
const visit_activities_1 = __importDefault(require("./data-models/visit_activities"));
const fcm_login_device_map_1 = __importDefault(require("./data-models/fcm_login_device_map"));
exports.tableDefinitions = {
    address: address_1.default,
    bank_accounts: bank_accounts_1.default,
    bill: bill_1.default,
    clinic: clinic_1.default,
    clinic_activation_history: clinic_activation_history_1.default,
    clinic_availability: clinic_availability_1.default,
    clinic_branch: clinic_branch_1.default,
    clinic_lead: clinic_lead_1.default,
    clinic_licenses: clinic_licenses_1.default,
    clinic_profiles: clinic_profiles_1.default,
    clinic_speciality_option_pricing: clinic_speciality_option_pricing_1.default,
    clinic_tax: clinic_tax_1.default,
    evisit_details: evisit_details_1.default,
    evisit_details_history: evisit_details_history_1.default,
    evisit_details_notes: evisit_details_notes_1.default,
    favourite: favourite_1.default,
    fcm_login_device_map: fcm_login_device_map_1.default,
    feedback: feedback_1.default,
    images: images_1.default,
    integrator_bookings: integrator_bookings_1.default,
    login: login_1.default,
    mstr_breed: mstr_breed_1.default,
    mstr_coat: mstr_coat_1.default,
    mstr_gender: mstr_gender_1.default,
    mstr_product_categories: mstr_product_categories_1.default,
    mstr_pet_types: mstr_pet_types_1.default,
    mstr_provider_product_channels: mstr_provider_product_channels_1.default,
    mstr_provider_plan_features: mstr_provider_plan_features_1.default,
    mstr_provider_plan_prices: mstr_provider_plan_prices_1.default,
    mstr_provider_plans: mstr_provider_plans_1.default,
    mstr_status: mstr_status_1.default,
    otp_data: otp_data_1.default,
    payment_details: payment_details_1.default,
    payment_details_history: payment_details_history_1.default,
    pet_history: pet_history_1.default,
    pet_medical_history: pet_medical_history_1.default,
    pet_vitals: pet_vitals_1.default,
    pets: pets_1.default,
    promotion: promotion_1.default,
    promotion_rules: promotion_rules_1.default,
    provider_boarding_prices: provider_boarding_prices_1.default,
    provider_boardings: provider_boardings_1.default,
    provider_experience_price: provider_experience_price_1.default,
    provider_inspection_checklist: provider_inspection_checklist_1.default,
    provider_inspection_checklist_questions: provider_inspection_checklist_questions_1.default,
    provider_inventory_locations: provider_inventory_locations_1.default,
    provider_inventory_movements: provider_inventory_movements_1.default,
    provider_inventory_batch: provider_inventory_batch_1.default,
    provider_inventory_stock: provider_inventory_stock_1.default,
    provider_package_services: provider_package_services_1.default,
    provider_packages: provider_packages_1.default,
    provider_service_consumables: provider_service_consumables_1.default,
    provider_product_channels: provider_product_channels_1.default,
    provider_product_variants: provider_product_variants_1.default,
    provider_products: provider_products_1.default,
    provider_price_base_variables: provider_price_base_variables_1.default,
    provider_price_coat_complexity: provider_price_coat_complexity_1.default,
    provider_price_life_stage_surcharges: provider_price_life_stage_surcharges_1.default,
    provider_price_specialist_surcharges: provider_price_specialist_surcharges_1.default,
    provider_schedules: provider_schedules_1.default,
    provider_subscriptions: provider_subscriptions_1.default,
    provider_subscriptions_history: provider_subscriptions_history_1.default,
    session: session_1.default,
    visit_activities: visit_activities_1.default,
};
//# sourceMappingURL=tables.js.map