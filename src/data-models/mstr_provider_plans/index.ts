import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type MstrProviderPlansTable = typeof mstrProviderPlansTable;

export const mstrProviderPlansTable: TableDefinition = {
  tableName: 'mstr_provider_plans',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrProviderPlansTable;
