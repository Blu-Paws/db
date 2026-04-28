import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderSubscriptionsHistoryTable = typeof providerSubscriptionsHistoryTable;

export const providerSubscriptionsHistoryTable: TableDefinition = {
  tableName: 'provider_subscriptions_history',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerSubscriptionsHistoryTable;
