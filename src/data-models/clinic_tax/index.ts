import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicTaxTable = typeof clinicTaxTable;

export const clinicTaxTable: TableDefinition = {
  tableName: 'clinic_tax',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicTaxTable;
