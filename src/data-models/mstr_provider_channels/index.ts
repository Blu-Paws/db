import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type MstrProviderChannelsTable = typeof mstrProviderChannelsTable;

export const mstrProviderChannelsTable: TableDefinition = {
  tableName: 'mstr_provider_channels',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrProviderChannelsTable;
