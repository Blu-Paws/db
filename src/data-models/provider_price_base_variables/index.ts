import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderPriceBaseVariablesTable = typeof providerPriceBaseVariablesTable;

export const providerPriceBaseVariablesTable: TableDefinition = {
  tableName: 'provider_price_base_variables',
  model: model as DataModel,
  view: view as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPriceBaseVariablesTable;
