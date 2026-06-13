import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type MstrGenderTable = typeof mstrGenderTable;

export const mstrGenderTable: TableDefinition = {
  tableName: 'mstr_gender',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default mstrGenderTable;
