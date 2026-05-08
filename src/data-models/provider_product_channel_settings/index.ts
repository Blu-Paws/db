import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderProductChannelSettingsTable =
  typeof providerProductChannelSettingsTable;

export const providerProductChannelSettingsTable: TableDefinition = {
  tableName: 'provider_product_channel_settings',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerProductChannelSettingsTable;
