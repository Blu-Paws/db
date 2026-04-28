import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type VisitActivitiesTable = typeof visitActivitiesTable;

export const visitActivitiesTable: TableDefinition = {
  tableName: 'visit_activities',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default visitActivitiesTable;
