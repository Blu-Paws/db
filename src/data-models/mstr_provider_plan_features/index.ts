import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition } from '../../types';

export type MstrProviderPlanFeaturesTable = typeof mstrProviderPlanFeaturesTable;

export const mstrProviderPlanFeaturesTable: TableDefinition = {
  tableName: 'mstr_provider_plan_features',
  model: model as DataModel,
  view: view as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrProviderPlanFeaturesTable;
