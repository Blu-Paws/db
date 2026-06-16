import model from './model.json';
import view from './view.json';

import type { DataModel, TableDefinition, ViewModel } from '../../types';

export type FCMLoginDeviceMapTable = typeof fcmLoginDeviceMapTable;

export const fcmLoginDeviceMapTable: TableDefinition = {
  tableName: 'fcm_login_device_map',
  model: model as DataModel,
  view: view as ViewModel,
  validateInsert: async (_conn, _row) => {},
  validateUpdate: async (_conn, _row) => {},
  validateDelete: async (_conn, _row) => {},
};

export default fcmLoginDeviceMapTable;
