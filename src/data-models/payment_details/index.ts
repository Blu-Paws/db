import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PaymentDetailsTable = typeof paymentDetailsTable;

export const paymentDetailsTable: TableDefinition = {
  tableName: 'payment_details',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default paymentDetailsTable;
