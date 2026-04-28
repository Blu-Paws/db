import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicSpecialityOptionPricingTable = typeof clinicSpecialityOptionPricingTable;

export const clinicSpecialityOptionPricingTable: TableDefinition = {
  tableName: 'clinic_speciality_option_pricing',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicSpecialityOptionPricingTable;
