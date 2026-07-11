import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type DatabaseConfig,
  deleteRecord,
  getAllKeys,
  getAllRecords,
  getRecord,
  openDatabase,
  putRecord,
  putRecordWithKey,
  resetDatabaseConnectionForTesting,
} from './index.js';

/** keyPath を持つストアと out-of-line key ストアの両方を持つテスト用スキーマ。 */
const KEYED_STORE = 'keyed';
const INLINE_STORE = 'inline';

function makeConfig(name: string): DatabaseConfig {
  return {
    name,
    version: 1,
    upgrade: (database) => {
      if (!database.objectStoreNames.contains(KEYED_STORE)) {
        database.createObjectStore(KEYED_STORE);
      }
      if (!database.objectStoreNames.contains(INLINE_STORE)) {
        database.createObjectStore(INLINE_STORE, { keyPath: 'id' });
      }
    },
  };
}

let databaseName = '';
let counter = 0;

beforeEach(() => {
  resetDatabaseConnectionForTesting();
  counter += 1;
  databaseName = `vitelab-db-test-${counter}`;
});

afterEach(() => {
  resetDatabaseConnectionForTesting();
});

describe('openDatabase', () => {
  it('同一名の接続はキャッシュされ同じインスタンスを返す', async () => {
    const config = makeConfig(databaseName);
    const first = await openDatabase(config);
    const second = await openDatabase(config);
    expect(first).toBe(second);
  });
});

describe('out-of-line key ストアの CRUD', () => {
  it('putRecordWithKey / getRecord / deleteRecord が往復する', async () => {
    const database = await openDatabase(makeConfig(databaseName));
    await putRecordWithKey(database, KEYED_STORE, 'alpha', { label: 'A' });

    const loaded = await getRecord<{ label: string }>(database, KEYED_STORE, 'alpha');
    expect(loaded).toEqual({ label: 'A' });

    await deleteRecord(database, KEYED_STORE, 'alpha');
    const afterDelete = await getRecord(database, KEYED_STORE, 'alpha');
    expect(afterDelete).toBeUndefined();
  });

  it('getAllRecords / getAllKeys が保存分を返す', async () => {
    const database = await openDatabase(makeConfig(databaseName));
    await putRecordWithKey(database, KEYED_STORE, 'a', { n: 1 });
    await putRecordWithKey(database, KEYED_STORE, 'b', { n: 2 });

    const records = await getAllRecords<{ n: number }>(database, KEYED_STORE);
    const keys = await getAllKeys(database, KEYED_STORE);
    expect(records).toHaveLength(2);
    expect(keys).toEqual(['a', 'b']);
  });
});

describe('keyPath ストアの CRUD', () => {
  it('putRecord は value の keyPath からキーを導出する', async () => {
    const database = await openDatabase(makeConfig(databaseName));
    await putRecord(database, INLINE_STORE, { id: 'deck-1', title: 'Set' });

    const loaded = await getRecord<{ id: string; title: string }>(database, INLINE_STORE, 'deck-1');
    expect(loaded).toEqual({ id: 'deck-1', title: 'Set' });
  });
});
