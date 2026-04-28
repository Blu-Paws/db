import model from './model.json';

import type { DataModel, TableDefinition } from '../../types';

export type ProviderInspectionChecklistQuestionsTable = typeof providerInspectionChecklistQuestionsTable;

export const providerInspectionChecklistQuestionsTable: TableDefinition = {
  tableName: 'provider_inspection_checklist_questions',
  model: model as DataModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerInspectionChecklistQuestionsTable;
