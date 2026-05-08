import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderInventoryStockTable = typeof providerInventoryStockTable;

export const providerInventoryStockTable: TableDefinition = {
  tableName: 'provider_inventory_stock',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerInventoryStockTable;
