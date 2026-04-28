import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type EvisitDetailsHistoryTable = typeof evisitDetailsHistoryTable;

export const evisitDetailsHistoryTable: TableDefinition = {
  tableName: 'evisit_details_history',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default evisitDetailsHistoryTable;
