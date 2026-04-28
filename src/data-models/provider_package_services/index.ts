import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderPackageServicesTable = typeof providerPackageServicesTable;

export const providerPackageServicesTable: TableDefinition = {
  tableName: 'provider_package_services',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPackageServicesTable;
