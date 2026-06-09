import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition } from '../../types';

export type EvisitDetailsTable = typeof evisitDetailsTable;

export const evisitDetailsTable: TableDefinition = {
  tableName: 'evisit_details',
  model: model as DataModel,
  view: view as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default evisitDetailsTable;
