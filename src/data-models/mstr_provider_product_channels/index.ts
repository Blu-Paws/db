import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type MstrProviderProductChannelsTable =
  typeof mstrProviderProductChannelsTable;

export const mstrProviderProductChannelsTable: TableDefinition = {
  tableName: 'mstr_provider_product_channels',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrProviderProductChannelsTable;
