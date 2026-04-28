import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderSubscriptionsTable = typeof providerSubscriptionsTable;

export const providerSubscriptionsTable: TableDefinition = {
  tableName: 'provider_subscriptions',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerSubscriptionsTable;
