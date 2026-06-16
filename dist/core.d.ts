import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { BPConnection, Flavor, Stage } from './types';
export declare const createConnection: (stageValue: Stage, flavorValue: Flavor) => BPConnection;
export declare const createJWTToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyJWTToken: (stageValue: Stage, token: string) => Promise<string | jwt.JwtPayload>;
export declare const createRefreshToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyRefreshToken: (stageValue: Stage, token: string) => Promise<string | jwt.JwtPayload>;
export declare const getAuthenticatedUserDetails: (stageValue: Stage, headers: Record<string, string>) => Promise<{
    clinic: mysql.RowDataPacket;
    user: {
        constructor: {
            name: "RowDataPacket";
        };
        login_id: any;
    };
    error?: undefined;
} | {
    user: string | jwt.JwtPayload;
    clinic?: undefined;
    error?: undefined;
} | {
    error: any;
    clinic?: undefined;
    user?: undefined;
}>;
