import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type LoginTable = typeof loginTable;

export const loginTable: TableDefinition = {
  tableName: 'login',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default loginTable;
