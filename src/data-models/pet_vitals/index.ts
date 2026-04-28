import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PetVitalsTable = typeof petVitalsTable;

export const petVitalsTable: TableDefinition = {
  tableName: 'pet_vitals',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default petVitalsTable;
