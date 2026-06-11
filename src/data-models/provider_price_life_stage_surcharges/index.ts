import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderPriceLifeStageSurchargesTable = typeof providerPriceLifeStageSurchargesTable;

export const providerPriceLifeStageSurchargesTable: TableDefinition = {
  tableName: 'provider_price_life_stage_surcharges',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerPriceLifeStageSurchargesTable;
