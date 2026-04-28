import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PromotionRulesTable = typeof promotionRulesTable;

export const promotionRulesTable: TableDefinition = {
  tableName: 'promotion_rules',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default promotionRulesTable;
