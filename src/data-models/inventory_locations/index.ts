import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type InventoryLocationsTable = typeof inventoryLocationsTable;

export const inventoryLocationsTable: TableDefinition = {
  tableName: 'inventory_locations',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default inventoryLocationsTable;
