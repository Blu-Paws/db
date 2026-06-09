import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicActivationHistoryTable = typeof clinicActivationHistoryTable;

export const clinicActivationHistoryTable: TableDefinition = {
  tableName: 'clinic_activation_history',
  model: model as DataModel,
  view: view as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicActivationHistoryTable;
