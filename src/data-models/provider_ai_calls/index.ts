import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type ProviderAiCallsTable = typeof providerAiCallsTable;

export const providerAiCallsTable: TableDefinition = {
  tableName: 'provider_ai_calls',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerAiCallsTable;
