import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderProductsTable = typeof providerProductsTable;

export const providerProductsTable: TableDefinition = {
  tableName: 'provider_products',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerProductsTable;
