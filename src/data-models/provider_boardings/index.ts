import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderBoardingsTable = typeof providerBoardingsTable;

export const providerBoardingsTable: TableDefinition = {
  tableName: 'provider_boardings',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerBoardingsTable;
