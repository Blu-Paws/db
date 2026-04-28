import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type EvisitDetailsNotesTable = typeof evisitDetailsNotesTable;

export const evisitDetailsNotesTable: TableDefinition = {
  tableName: 'evisit_details_notes',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default evisitDetailsNotesTable;
