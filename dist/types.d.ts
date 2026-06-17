import type { Pool, PoolConnection, QueryError, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { VIEW_LOGIN } from './data-models/login/type';
import { VIEW_CLINIC } from './data-models/clinic/type';
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
export type DataModel = Record<string, DataModelField>;
export type DataRow = Record<string, unknown>;
export type Flavor = string;
export type TableOperation = 'insert' | 'update' | 'delete';
export type ViewAssociationJoin = {
    tableName: string;
    sourceField: string;
    sourceAlias?: string;
    targetField: string;
    targetFilters?: DataRow;
    alias?: string;
    joinType?: 'LEFT' | 'INNER';
};
export type ViewAssociation = {
    tableName?: string;
    sourceField?: string;
    sourceAlias?: string;
    targetField?: string;
    targetFilters?: DataRow;
    targetSelectField?: string;
    alias?: string;
    joinType?: 'LEFT' | 'INNER';
    path?: ViewAssociationJoin[];
};
export type ViewAssociations = Record<string, ViewAssociation>;
export type ViewModelField = {
    association?: string | ViewAssociation;
    field?: string;
    type: ModelFieldType;
};
export type ViewModel = Record<string, ViewModelField>;
export type ReadFilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
export type ReadFilter = {
    field: string;
    operator: ReadFilterOperator;
    value?: unknown;
};
export type ReadOptions = {
    fields?: string[];
    filters?: ReadFilter[];
};
export type GetRowOptions = ReadOptions;
export type GetRowsOptions = ReadOptions & {
    offset?: number;
    limit?: number;
};
export type GetRowsResult<T> = {
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
export type TableValidator<T extends DataRow = DataRow> = (conn: PoolConnection, row: T) => boolean | void | Promise<boolean | void>;
export type TableDefinition<T extends DataRow = DataRow> = {
    tableName: string;
    model: DataModel;
    view: ViewModel;
    associations?: ViewAssociations;
    validateInsert: TableValidator<T>;
    validateUpdate: TableValidator<T>;
    validateDelete: TableValidator<T>;
};
export type BPConnection = {
    query: <T extends QueryResult = RowDataPacket[]>(sql: string, values?: QueryValues, conn?: PoolConnection | null) => Promise<T>;
    withTransaction: <T>(callback: (conn: PoolConnection) => Promise<T>) => any;
    insertRowIntoTable: (tableName: string, row: DataRow, conn?: PoolConnection | null) => Promise<number>;
    insertRowsIntoTable: (tableName: string, row: DataRow[], conn?: PoolConnection | null) => Promise<void>;
    getRowFromTable: <T>(tableName: string, options?: GetRowOptions, conn?: PoolConnection | null) => Promise<T | null>;
    getRowsFromTable: <T>(tableName: string, optionsOrConn?: GetRowsOptions | PoolConnection | null, conn?: PoolConnection | null) => Promise<GetRowsResult<T>>;
    updateRowTable: (tableName: string, row: DataRow, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
    deleteRowFromTable: (tableName: string, clauses: DataRow, conn?: PoolConnection | null) => Promise<void>;
};
export type SQLConnection = PoolConnection;
export type AuthenticationResponse = {
    clinic: VIEW_CLINIC;
    user: VIEW_LOGIN;
    error?: undefined;
} | {
    user: VIEW_LOGIN;
    clinic?: undefined;
    error?: undefined;
} | {
    error: any;
    clinic?: undefined;
    user?: undefined;
};
