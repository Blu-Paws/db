import jwt from 'jsonwebtoken';
import type { AuthenticationResponse, BPConnection, Flavor, Stage } from './types';
import { VIEW_LOGIN } from './data-models/login/type';
export declare const createConnection: (stageValue: Stage, flavorValue: Flavor) => BPConnection;
export declare const createJWTToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyJWTToken: (stageValue: Stage, token: string) => Promise<VIEW_LOGIN>;
export declare const createRefreshToken: (stageValue: Stage, payload: Record<string, string | number>, expiresIn: any) => Promise<string>;
export declare const verifyRefreshToken: (stageValue: Stage, token: string) => Promise<string | jwt.JwtPayload>;
export declare const getAuthenticatedUserDetails: (stageValue: Stage, headers: Record<string, string>) => Promise<AuthenticationResponse>;
