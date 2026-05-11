import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderSchedulesTable = typeof providerSchedulesTable;

export const providerSchedulesTable: TableDefinition = {
  tableName: 'provider_schedules',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerSchedulesTable;
