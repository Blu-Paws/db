import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type OtpDataTable = typeof otpDataTable;

export const otpDataTable: TableDefinition = {
  tableName: 'otp_data',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default otpDataTable;
