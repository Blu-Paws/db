import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderInventoryBatchTable = typeof providerInventoryBatchTable;

export const providerInventoryBatchTable: TableDefinition = {
  tableName: 'provider_inventory_batch',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerInventoryBatchTable;
