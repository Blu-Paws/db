import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderInventoryLocationsTable =
  typeof providerInventoryLocationsTable;

export const providerInventoryLocationsTable: TableDefinition = {
  tableName: 'provider_inventory_locations',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerInventoryLocationsTable;
