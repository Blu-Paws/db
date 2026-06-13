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

export type DataModelField = {
  autoincrement?: boolean;
  createable?: boolean;
  primary?: boolean;
  updateable?: boolean;
  required?: boolean;
  type: ModelFieldType;
};

export type DataModel = Record<
  string,
  DataModelField
>;

export type DataRow = Record<string, unknown>;
export type Flavor = string;
export type TableOperation = 'insert' | 'update' | 'delete';

export type ViewAssociation = {
  tableName: string;
  sourceField: string;
  sourceAlias?: string;
  targetField: string;
  targetFilters?: DataRow;
  targetSelectField?: string;
  alias?: string;
  joinType?: 'LEFT' | 'INNER';
};

export type ViewModelField = {
  association?: ViewAssociation;
  type: ModelFieldType;
};

export type ViewModelMeta = {
  where?: DataRow;
};

export type ViewModel = {
  [key: string]: ViewModelField | ViewModelMeta | undefined;
  __meta?: ViewModelMeta;
};

export type GetRowsOptions = {
  offset?: number;
  limit?: number;
};

export type GetRowsResult<T extends DataRow = DataRow> = {
  offset: number;
  limit: number;
  items: T[];
  count: number;
};

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
  view: ViewModel;
  validateInsert: TableValidator<T>;
  validateUpdate: TableValidator<T>;
  validateDelete: TableValidator<T>;
};
