import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderExceptionsTable = typeof providerExceptionsTable;

export const providerExceptionsTable: TableDefinition = {
  tableName: 'provider_exceptions',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerExceptionsTable;
