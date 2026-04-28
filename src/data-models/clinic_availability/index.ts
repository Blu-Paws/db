import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ClinicAvailabilityTable = typeof clinicAvailabilityTable;

export const clinicAvailabilityTable: TableDefinition = {
  tableName: 'clinic_availability',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default clinicAvailabilityTable;
