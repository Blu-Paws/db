import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PetsTable = typeof petsTable;

export const petsTable: TableDefinition = {
  tableName: 'pets',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default petsTable;
