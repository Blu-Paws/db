import model from './model.json';
import associations from './associations.json';
import view from './view.json';

import type {
  DataModel,
  TableDefinition,
  ViewAssociations,
  ViewModel,
} from '../../types';

export type PetsTable = typeof petsTable;

export const petsTable: TableDefinition = {
  tableName: 'pets',
  model: model as DataModel,
  view: view as ViewModel,
  associations: associations as ViewAssociations,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default petsTable;
