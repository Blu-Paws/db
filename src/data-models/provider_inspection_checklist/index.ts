import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderInspectionChecklistTable = typeof providerInspectionChecklistTable;

export const providerInspectionChecklistTable: TableDefinition = {
  tableName: 'provider_inspection_checklist',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerInspectionChecklistTable;
