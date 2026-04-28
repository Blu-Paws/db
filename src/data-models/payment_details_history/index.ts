import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PaymentDetailsHistoryTable = typeof paymentDetailsHistoryTable;

export const paymentDetailsHistoryTable: TableDefinition = {
  tableName: 'payment_details_history',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default paymentDetailsHistoryTable;
