import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderPackagesTable = typeof providerPackagesTable;

export const providerPackagesTable: TableDefinition = {
  tableName: 'provider_packages',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPackagesTable;
