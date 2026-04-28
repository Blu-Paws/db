import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type AddressTable = typeof addressTable;

export const addressTable: TableDefinition = {
  tableName: 'address',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default addressTable;
