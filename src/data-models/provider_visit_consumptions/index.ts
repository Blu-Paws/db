import model from './model.json';
import view from './view.json';
import associations from './associations.json';

import type {
  DataModel,
  TableDefinition,
  ViewAssociations,
  ViewModel,
} from '../../types';

export type ProviderVisitConsumptionsTable =
  typeof providerVisitConsumptionsTable;

export const providerVisitConsumptionsTable: TableDefinition = {
  tableName: 'provider_visit_consumptions',
  model: model as DataModel,
  view: view as ViewModel,
  associations: associations as ViewAssociations,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default providerVisitConsumptionsTable;
