import type {
  Pool,
  PoolConnection,
  QueryError,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

export type Stage = string;
export type QueryValues = unknown[] | Record<string, unknown>;
export type QueryResult = RowDataPacket[] | RowDataPacket[][] | ResultSetHeader;
export type ModelFieldType = 'string' | 'number' | 'datetime';

export type DataModel = Record<
  string,
  {
    createable?: boolean;
    updateable?: boolean;
    required?: boolean;
    type: ModelFieldType;
  }
>;

export type DataRow = Record<string, unknown>;
export type Flavor = string;
export type TableOperation = 'insert' | 'update' | 'delete';

export type FatalMysqlError = QueryError & {
  fatal?: boolean;
};

export type BluPawsPool = Pool & {
  _blupawsListenersAttached?: boolean;
  on: (event: string, listener: (...args: any[]) => void) => BluPawsPool;
};

export type TableValidator<T extends DataRow = DataRow> = (
  conn: PoolConnection,
  row: T,
) => boolean | void | Promise<boolean | void>;

export type TableDefinition<T extends DataRow = DataRow> = {
  tableName: string;
  model: DataModel;
  view: DataModel;
  validateInsert: TableValidator<T>;
  validateUpdate: TableValidator<T>;
  validateDelete: TableValidator<T>;
};
