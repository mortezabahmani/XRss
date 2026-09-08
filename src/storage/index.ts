import { StorageAdapter } from '../core/types';
import { Env } from '../config';
import { D1StorageAdapter } from './d1_storage';
import { KVStorageAdapter } from './kv_storage';

export function createStorage(env: Env): StorageAdapter | null {
  if (env.KV) {
    return new KVStorageAdapter(env.KV);
  }
  if (env.DB) {
    return new D1StorageAdapter(env.DB);
  }
  return null;
}

export { D1StorageAdapter } from './d1_storage';
export { KVStorageAdapter } from './kv_storage';
