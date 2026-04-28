import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicTable = typeof clinicTable;

export const clinicTable: TableDefinition = {
  tableName: 'clinic',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicTable;
