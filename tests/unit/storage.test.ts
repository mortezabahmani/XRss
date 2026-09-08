import { describe, it, expect } from 'vitest';
import { createStorage, KVStorageAdapter, D1StorageAdapter } from '../../src/storage';
import { Env } from '../../src/config';

describe('createStorage Factory', () => {
  it('returns KVStorageAdapter when env.KV is present', () => {
    const mockKv = {} as KVNamespace;
    const env: Env = {
      KV: mockKv,
    };

    const storage = createStorage(env);
    expect(storage).toBeInstanceOf(KVStorageAdapter);
  });

  it('returns D1StorageAdapter when env.DB is present and env.KV is absent', () => {
    const mockDb = {} as D1Database;
    const env: Env = {
      DB: mockDb,
    };

    const storage = createStorage(env);
    expect(storage).toBeInstanceOf(D1StorageAdapter);
  });

  it('prioritizes KVStorageAdapter over D1StorageAdapter when both env.KV and env.DB are present', () => {
    const mockKv = {} as KVNamespace;
    const mockDb = {} as D1Database;
    const env: Env = {
      KV: mockKv,
      DB: mockDb,
    };

    const storage = createStorage(env);
    expect(storage).toBeInstanceOf(KVStorageAdapter);
  });

  it('returns null when neither env.KV nor env.DB is present', () => {
    const env: Env = {};

    const storage = createStorage(env);
    expect(storage).toBeNull();
  });
});
