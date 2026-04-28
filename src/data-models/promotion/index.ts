import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PromotionTable = typeof promotionTable;

export const promotionTable: TableDefinition = {
  tableName: 'promotion',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default promotionTable;
