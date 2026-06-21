import associations from './associations.json';
import model from './model.json';
import view from './view.json';

import type {
  DataModel,
  TableDefinition,
  ViewAssociations,
  ViewModel,
} from '../../types';

export type ProviderProductsTable = typeof providerProductsTable;

export const providerProductsTable: TableDefinition = {
  tableName: 'provider_products',
  model: model as DataModel,
  view: view as ViewModel,
  associations: associations as ViewAssociations,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerProductsTable;
