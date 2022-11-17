import { AccountProvider } from './index';
import { DID } from 'dids';
import { JWS } from '@js-sao-did/common';
export declare function encodeKey(key: Uint8Array, keyType: string): string;
export declare function generateAccountSecret(accountProvider: AccountProvider, accountId: string): Promise<Uint8Array>;
export declare function accountSecretToDid(accountSecret: Uint8Array): Promise<DID>;
export declare function toStableObject(obj: Record<string, any>): Record<string, any>;
export declare function toJWS(jws: string): JWS;
