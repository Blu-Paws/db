import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type FavouriteTable = typeof favouriteTable;

export const favouriteTable: TableDefinition = {
  tableName: 'favourite',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default favouriteTable;
