import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicLicensesTable = typeof clinicLicensesTable;

export const clinicLicensesTable: TableDefinition = {
  tableName: 'clinic_licenses',
  model: model as DataModel,
  view: view as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicLicensesTable;
