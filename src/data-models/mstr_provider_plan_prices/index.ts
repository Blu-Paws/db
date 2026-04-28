import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type MstrProviderPlanPricesTable = typeof mstrProviderPlanPricesTable;

export const mstrProviderPlanPricesTable: TableDefinition = {
  tableName: 'mstr_provider_plan_prices',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrProviderPlanPricesTable;
