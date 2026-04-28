import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type SessionTable = typeof sessionTable;

export const sessionTable: TableDefinition = {
  tableName: 'session',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default sessionTable;
