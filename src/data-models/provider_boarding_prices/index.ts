import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderBoardingPricesTable = typeof providerBoardingPricesTable;

export const providerBoardingPricesTable: TableDefinition = {
  tableName: 'provider_boarding_prices',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerBoardingPricesTable;
