import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type DatabaseConfig,
  defineStore,
  openDatabase,
  putRecordWithKey,
  resetDatabaseConnectionForTesting,
} from './index.js';

/** payload プロパティを持つ最小レコードの型ガード。 */
function isPayload(value: unknown): value is { payload: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).payload === 'string'
  );
}

/** SyncImageDeck の 3 リポジトリパターン（keyPath / out-of-line / KV）を再現するテスト。 */

const DECK_STORE = 'decks';
const BLOB_STORE = 'blobs';
const SETTINGS_STORE = 'settings';

interface Deck {
  readonly id: string;
  readonly title: string;
}

function isDeck(value: unknown): value is Deck {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.title === 'string';
}

interface SettingRecord {
  readonly key: string;
  readonly value: string;
}

function isSettingRecord(value: unknown): value is SettingRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.key === 'string' && typeof record.value === 'string';
}

let databaseName = '';
let counter = 0;

function makeConfig(name: string): DatabaseConfig {
  return {
    name,
    version: 1,
    upgrade: (database) => {
      if (!database.objectStoreNames.contains(DECK_STORE)) {
        database.createObjectStore(DECK_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(BLOB_STORE)) {
        database.createObjectStore(BLOB_STORE);
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE);
      }
    },
  };
}

beforeEach(() => {
  resetDatabaseConnectionForTesting();
  counter += 1;
  databaseName = `vitelab-definestore-test-${counter}`;
});

afterEach(() => {
  resetDatabaseConnectionForTesting();
});

describe('keyPath パターン（Deck 相当）', () => {
  it('save は value 自身からキーを導出し load/loadAll できる', async () => {
    const store = defineStore<Deck, string>({
      database: makeConfig(databaseName),
      storeName: DECK_STORE,
      guard: isDeck,
      keyPath: 'id',
    });

    await store.save({ id: 'deck-1', title: 'Warmup' });
    await store.save({ id: 'deck-2', title: 'Peak' });

    expect(await store.load('deck-1')).toEqual({ id: 'deck-1', title: 'Warmup' });
    expect(await store.loadAll()).toHaveLength(2);
    expect(await store.loadAllKeys()).toEqual(['deck-1', 'deck-2']);

    await store.remove('deck-1');
    expect(await store.load('deck-1')).toBeUndefined();
  });
});

describe('out-of-line key パターン（画像 Blob 相当）', () => {
  it('saveWithKey で明示キー保存し load できる', async () => {
    const store = defineStore<{ payload: string }, string>({
      database: makeConfig(databaseName),
      storeName: BLOB_STORE,
      guard: isPayload,
    });

    await store.saveWithKey('hash-abc', { payload: 'binary' });
    expect(await store.load('hash-abc')).toEqual({ payload: 'binary' });
  });

  it('keyPath なしで save を呼ぶと例外を投げる', async () => {
    const store = defineStore<{ payload: string }, string>({
      database: makeConfig(databaseName),
      storeName: BLOB_STORE,
      guard: isPayload,
    });

    await expect(store.save({ payload: 'x' })).rejects.toThrow(/saveWithKey/);
  });
});

describe('KV パターン（設定 相当）+ 境界防御', () => {
  it('guard を通らない壊れたレコードは load で undefined、loadAll で除外される', async () => {
    const store = defineStore<SettingRecord, string>({
      database: makeConfig(databaseName),
      storeName: SETTINGS_STORE,
      guard: isSettingRecord,
    });

    await store.saveWithKey('locale', { key: 'locale', value: 'ja' });
    // 壊れた値を直接ねじ込む（別スキーマ・別バージョンが書いた状況を模擬）
    const database = await openDatabase(makeConfig(databaseName));
    await putRecordWithKey(database, SETTINGS_STORE, 'broken', { unexpected: 42 });

    expect(await store.load('locale')).toEqual({ key: 'locale', value: 'ja' });
    expect(await store.load('broken')).toBeUndefined();
    expect(await store.loadAll()).toEqual([{ key: 'locale', value: 'ja' }]);
  });
});
