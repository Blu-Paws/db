import type { TableDefinition } from './types';

import addressTable from './data-models/address';
import bankAccountsTable from './data-models/bank_accounts';
import billTable from './data-models/bill';
import clinicTable from './data-models/clinic';
import clinicActivationHistoryTable from './data-models/clinic_activation_history';
import clinicAvailabilityTable from './data-models/clinic_availability';
import clinicBranchTable from './data-models/clinic_branch';
import clinicLeadTable from './data-models/clinic_lead';
import clinicLicensesTable from './data-models/clinic_licenses';
import clinicProfilesTable from './data-models/clinic_profiles';
import clinicSpecialityOptionPricingTable from './data-models/clinic_speciality_option_pricing';
import clinicTaxTable from './data-models/clinic_tax';
import evisitDetailsTable from './data-models/evisit_details';
import evisitDetailsHistoryTable from './data-models/evisit_details_history';
import evisitDetailsNotesTable from './data-models/evisit_details_notes';
import favouriteTable from './data-models/favourite';
import feedbackTable from './data-models/feedback';
import imagesTable from './data-models/images';
import integratorBookingsTable from './data-models/integrator_bookings';
import loginTable from './data-models/login';
import mstrProductCategoriesTable from './data-models/mstr_product_categories';
import mstrBreedTable from './data-models/mstr_breed';
import mstrCoatTable from './data-models/mstr_coat';
import mstrGenderTable from './data-models/mstr_gender';
import mstrPetTypesTable from './data-models/mstr_pet_types';
import mstrProviderProductChannelsTable from './data-models/mstr_provider_product_channels';
import mstrProviderPlanFeaturesTable from './data-models/mstr_provider_plan_features';
import mstrProviderPlanPricesTable from './data-models/mstr_provider_plan_prices';
import mstrProviderPlansTable from './data-models/mstr_provider_plans';
import mstrStatusTable from './data-models/mstr_status';
import otpDataTable from './data-models/otp_data';
import paymentDetailsTable from './data-models/payment_details';
import paymentDetailsHistoryTable from './data-models/payment_details_history';
import petHistoryTable from './data-models/pet_history';
import petMedicalHistoryTable from './data-models/pet_medical_history';
import petVitalsTable from './data-models/pet_vitals';
import petsTable from './data-models/pets';
import promotionTable from './data-models/promotion';
import promotionRulesTable from './data-models/promotion_rules';
import providerBoardingPricesTable from './data-models/provider_boarding_prices';
import providerBoardingsTable from './data-models/provider_boardings';
import providerExceptionsTable from './data-models/provider_exceptions';
import providerExperiencePriceTable from './data-models/provider_experience_price';
import providerInspectionChecklistTable from './data-models/provider_inspection_checklist';
import providerInspectionChecklistQuestionsTable from './data-models/provider_inspection_checklist_questions';
import providerInventoryLocationsTable from './data-models/provider_inventory_locations';
import providerInventoryMovementsTable from './data-models/provider_inventory_movements';
import providerInventoryBatch from './data-models/provider_inventory_batch';
import providerInventoryStockTable from './data-models/provider_inventory_stock';
import providerPackageServicesTable from './data-models/provider_package_services';
import providerPackagesTable from './data-models/provider_packages';
import providerProductChannelsTable from './data-models/provider_product_channels';
import providerProductVariantsTable from './data-models/provider_product_variants';
import providerProductsTable from './data-models/provider_products';
import providerPriceBaseVariablesTable from './data-models/provider_price_base_variables';
import providerPriceCoatComplexityTable from './data-models/provider_price_coat_complexity';
import providerPriceLifeStageSurchargesTable from './data-models/provider_price_life_stage_surcharges';
import providerPriceSpecialistSurchargesTable from './data-models/provider_price_specialist_surcharges';
import providerSchedulesTable from './data-models/provider_schedules';
import providerSubscriptionsTable from './data-models/provider_subscriptions';
import providerSubscriptionsHistoryTable from './data-models/provider_subscriptions_history';
import sessionTable from './data-models/session';
import visitActivitiesTable from './data-models/visit_activities';
import fcmLoginDeviceMapTable from './data-models/fcm_login_device_map';

export const tableDefinitions = {
  address: addressTable,
  bank_accounts: bankAccountsTable,
  bill: billTable,
  clinic: clinicTable,
  clinic_activation_history: clinicActivationHistoryTable,
  clinic_availability: clinicAvailabilityTable,
  clinic_branch: clinicBranchTable,
  clinic_lead: clinicLeadTable,
  clinic_licenses: clinicLicensesTable,
  clinic_profiles: clinicProfilesTable,
  clinic_speciality_option_pricing: clinicSpecialityOptionPricingTable,
  clinic_tax: clinicTaxTable,
  evisit_details: evisitDetailsTable,
  evisit_details_history: evisitDetailsHistoryTable,
  evisit_details_notes: evisitDetailsNotesTable,
  favourite: favouriteTable,
  fcm_login_device_map: fcmLoginDeviceMapTable,
  feedback: feedbackTable,
  images: imagesTable,
  integrator_bookings: integratorBookingsTable,
  login: loginTable,
  mstr_breed: mstrBreedTable,
  mstr_coat: mstrCoatTable,
  mstr_gender: mstrGenderTable,
  mstr_product_categories: mstrProductCategoriesTable,
  mstr_pet_types: mstrPetTypesTable,
  mstr_provider_product_channels: mstrProviderProductChannelsTable,
  mstr_provider_plan_features: mstrProviderPlanFeaturesTable,
  mstr_provider_plan_prices: mstrProviderPlanPricesTable,
  mstr_provider_plans: mstrProviderPlansTable,
  mstr_status: mstrStatusTable,
  otp_data: otpDataTable,
  payment_details: paymentDetailsTable,
  payment_details_history: paymentDetailsHistoryTable,
  pet_history: petHistoryTable,
  pet_medical_history: petMedicalHistoryTable,
  pet_vitals: petVitalsTable,
  pets: petsTable,
  promotion: promotionTable,
  promotion_rules: promotionRulesTable,
  provider_boarding_prices: providerBoardingPricesTable,
  provider_boardings: providerBoardingsTable,
  provider_exceptions: providerExceptionsTable,
  provider_experience_price: providerExperiencePriceTable,
  provider_inspection_checklist: providerInspectionChecklistTable,
  provider_inspection_checklist_questions:
    providerInspectionChecklistQuestionsTable,
  provider_inventory_locations: providerInventoryLocationsTable,
  provider_inventory_movements: providerInventoryMovementsTable,
  provider_inventory_batch: providerInventoryBatch,
  provider_inventory_stock: providerInventoryStockTable,
  provider_package_services: providerPackageServicesTable,
  provider_packages: providerPackagesTable,
  provider_product_channels: providerProductChannelsTable,
  provider_product_variants: providerProductVariantsTable,
  provider_products: providerProductsTable,
  provider_price_base_variables: providerPriceBaseVariablesTable,
  provider_price_coat_complexity: providerPriceCoatComplexityTable,
  provider_price_life_stage_surcharges: providerPriceLifeStageSurchargesTable,
  provider_price_specialist_surcharges: providerPriceSpecialistSurchargesTable,
  provider_schedules: providerSchedulesTable,
  provider_subscriptions: providerSubscriptionsTable,
  provider_subscriptions_history: providerSubscriptionsHistoryTable,
  session: sessionTable,
  visit_activities: visitActivitiesTable,
} satisfies Record<string, TableDefinition>;

export type TableName = keyof typeof tableDefinitions;
