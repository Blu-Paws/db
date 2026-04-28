import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type BankAccountsTable = typeof bankAccountsTable;

export const bankAccountsTable: TableDefinition = {
  tableName: 'bank_accounts',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default bankAccountsTable;
