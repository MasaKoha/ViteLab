/**
 * 型付き KV リポジトリを生成するファクトリ。
 * SyncImageDeck の indexedDbDeckRepository(keyPath 方式) / indexedDbImageRepository(out-of-line key + Blob) /
 * indexedDbSettingsRepository(KV) の 3 パターンを、これ 1 つで再現できるように設計している。
 * 読み出し時は必ず guard で境界防御し、壊れた保存値は undefined 扱いにする
 * （3 リポジトリすべてが型ガードで壊れたレコードを弾いていた挙動を踏襲）。
 */

import { type DatabaseConfig, openDatabase, withStore } from './db.js';

/** defineStore の設定。 */
export interface StoreDefinition<TValue> {
  /** 接続先データベースの設定。openDatabase にそのまま渡す。 */
  readonly database: DatabaseConfig;
  /** 対象オブジェクトストア名。config.upgrade 側で必ず作成しておくこと。 */
  readonly storeName: string;
  /**
   * 読み出し時の境界防御。保存後にスキーマが変わった／別バージョンが書いた壊れた値を弾く。
   * guard を通らないレコードは load では undefined、loadAll では除外される。
   */
  readonly guard: (value: unknown) => value is TValue;
  /**
   * in-line key を使う場合の keyPath 名。値自身からキーが導出される（例: deck の id）。
   * 省略時は out-of-line key となり、保存には saveWithKey を使う（例: 画像 Blob を hash キーで保存）。
   */
  readonly keyPath?: string;
}

/**
 * 型付きストア。keyPath を指定したストアは save、しないストアは saveWithKey を使う
 * （どちらを使うべきかは生成時の keyPath 有無で決まる）。
 */
export interface TypedStore<TValue, TKey extends IDBValidKey> {
  /** in-line key ストア用: 値自身の keyPath からキーが導出される。keyPath 未指定で呼ぶと例外。 */
  save(value: TValue): Promise<void>;
  /** out-of-line key ストア用: キーを明示して保存する。 */
  saveWithKey(key: TKey, value: TValue): Promise<void>;
  /** キー指定で 1 件取得する。存在しない／guard を通らない場合は undefined。 */
  load(key: TKey): Promise<TValue | undefined>;
  /** guard を通った全レコードを取得する。壊れたレコードは除外される。 */
  loadAll(): Promise<TValue[]>;
  /** 全キーを取得する。重い値本体を読まずキー一覧だけ欲しい場合に使う。 */
  loadAllKeys(): Promise<TKey[]>;
  /** キー指定で 1 件削除する。 */
  remove(key: TKey): Promise<void>;
}

/** 型付き KV ストアを生成する。 */
export function defineStore<TValue, TKey extends IDBValidKey = IDBValidKey>(
  definition: StoreDefinition<TValue>,
): TypedStore<TValue, TKey> {
  const runReadonly = async <T>(
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const database = await openDatabase(definition.database);
    return withStore<T>(database, definition.storeName, 'readonly', operation);
  };

  const runReadwrite = async <R>(
    operation: (store: IDBObjectStore) => IDBRequest<R>,
  ): Promise<void> => {
    const database = await openDatabase(definition.database);
    await withStore<R>(database, definition.storeName, 'readwrite', operation);
  };

  return {
    async save(value: TValue): Promise<void> {
      if (definition.keyPath === undefined) {
        throw new Error(
          `Store "${definition.storeName}" was defined without keyPath; use saveWithKey instead.`,
        );
      }
      await runReadwrite((store) => store.put(value as unknown as object));
    },

    async saveWithKey(key: TKey, value: TValue): Promise<void> {
      await runReadwrite((store) => store.put(value as unknown as object, key));
    },

    async load(key: TKey): Promise<TValue | undefined> {
      const record = await runReadonly<unknown>((store) => store.get(key));
      if (!definition.guard(record)) {
        return undefined;
      }
      return record;
    },

    async loadAll(): Promise<TValue[]> {
      const records = await runReadonly<unknown[]>((store) => store.getAll());
      return records.filter((record): record is TValue => definition.guard(record));
    },

    async loadAllKeys(): Promise<TKey[]> {
      const keys = await runReadonly<IDBValidKey[]>((store) => store.getAllKeys());
      return keys as TKey[];
    },

    async remove(key: TKey): Promise<void> {
      await runReadwrite((store) => store.delete(key));
    },
  };
}
