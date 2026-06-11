import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderPriceCoatComplexityTable = typeof providerPriceCoatComplexityTable;

export const providerPriceCoatComplexityTable: TableDefinition = {
  tableName: 'provider_price_coat_complexity',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPriceCoatComplexityTable;
