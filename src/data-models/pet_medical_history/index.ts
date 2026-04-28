import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type PetMedicalHistoryTable = typeof petMedicalHistoryTable;

export const petMedicalHistoryTable: TableDefinition = {
  tableName: 'pet_medical_history',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default petMedicalHistoryTable;
