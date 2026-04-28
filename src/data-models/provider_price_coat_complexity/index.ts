import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderPriceCoatComplexityTable = typeof providerPriceCoatComplexityTable;

export const providerPriceCoatComplexityTable: TableDefinition = {
  tableName: 'provider_price_coat_complexity',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPriceCoatComplexityTable;
