/**
 * IndexedDB の低レベル Promise ラッパー。
 * SyncImageDeck / ViewerStudioForNP2 / dj-tracklist の 3 実装は
 * 「接続キャッシュの有無」「トランジション完了の待ち方」「エラー時のフォールバックメッセージ」が
 * それぞれ微妙に異なっていたため、本モジュールで挙動を統一する。
 * - 接続キャッシュ: ViewerStudioForNP2 方式（モジュール内で Promise をキャッシュし、都度 open/close しない）を採用。
 * - トランジション完了待ち: SyncImageDeck の `waitForTransaction` 相当を内包し、
 *   `withStore` は request の成功だけでなく transaction の commit 完了まで待ってから resolve する
 *   （ViewerStudioForNP2 は request.onsuccess のみで resolve していたため、書き込みが確実に commit された保証がやや弱かった）。
 */

/** データベースを開く際の設定。ストア作成/マイグレーションは呼び出し元が upgrade で行う。 */
export interface DatabaseConfig {
  /** IndexedDB のデータベース名。 */
  readonly name: string;
  /** スキーマバージョン。ストア追加時はここを上げて upgrade 内でマイグレーションする。 */
  readonly version: number;
  /** onupgradeneeded で呼ばれ、ストアの作成・更新を行う。 */
  readonly upgrade: (database: IDBDatabase, oldVersion: number) => void;
}

let cachedDatabaseName: string | null = null;
let cachedDatabasePromise: Promise<IDBDatabase> | null = null;

/**
 * データベース接続を開く。同一プロセス内では最初に開いた接続をキャッシュして使い回すため、
 * 呼び出しごとに open/close を繰り返さない。
 */
export function openDatabase(config: DatabaseConfig): Promise<IDBDatabase> {
  if (cachedDatabasePromise !== null && cachedDatabaseName === config.name) {
    return cachedDatabasePromise;
  }

  cachedDatabaseName = config.name;
  cachedDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(config.name, config.version);

    request.onupgradeneeded = (event) => {
      config.upgrade(request.result, event.oldVersion);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to open IndexedDB "${config.name}".`));
    };

    request.onblocked = () => {
      reject(
        new Error(`IndexedDB upgrade for "${config.name}" is blocked by another open connection.`),
      );
    };
  });

  return cachedDatabasePromise;
}

/** テスト用: キャッシュした接続情報を破棄する。fake-indexeddb のリセットとあわせて呼ぶこと。 */
export function resetDatabaseConnectionForTesting(): void {
  cachedDatabaseName = null;
  cachedDatabasePromise = null;
}

/**
 * 1 つのストアに対する読み書きを 1 トランザクションで実行するヘルパー。
 * request の成功値を保持しつつ、transaction の commit 完了まで待ってから解決することで、
 * 呼び出し元が「書き込みが確実に反映された後」であることを前提にできるようにする。
 */
export function withStore<T>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    let requestResult: T;

    request.onsuccess = () => {
      requestResult = request.result;
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`IndexedDB request failed on store "${storeName}".`));
    };

    transaction.oncomplete = () => {
      resolve(requestResult);
    };

    transaction.onerror = () => {
      reject(
        transaction.error ?? new Error(`IndexedDB transaction failed on store "${storeName}".`),
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ?? new Error(`IndexedDB transaction aborted on store "${storeName}".`),
      );
    };
  });
}

/** キー指定で 1 件取得する。存在しなければ undefined。 */
export function getRecord<T>(
  database: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return withStore<T | undefined>(database, storeName, 'readonly', (store) => store.get(key));
}

/** ストア内の全レコードを取得する。 */
export function getAllRecords<T>(database: IDBDatabase, storeName: string): Promise<T[]> {
  return withStore<T[]>(database, storeName, 'readonly', (store) => store.getAll());
}

/** ストア内の全キーを取得する。Blob 等の重いレコードを読まずにキー一覧だけ欲しい場合に使う。 */
export function getAllKeys(database: IDBDatabase, storeName: string): Promise<IDBValidKey[]> {
  return withStore<IDBValidKey[]>(database, storeName, 'readonly', (store) => store.getAllKeys());
}

/** keyPath を持つストア向け: value 自身からキーが導出されるため key を渡さない。 */
export async function putRecord<T>(
  database: IDBDatabase,
  storeName: string,
  value: T,
): Promise<void> {
  await withStore<IDBValidKey>(database, storeName, 'readwrite', (store) =>
    store.put(value as unknown as object),
  );
}

/** keyPath を持たないストア向け: out-of-line key を明示して保存する。 */
export async function putRecordWithKey<T>(
  database: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
  value: T,
): Promise<void> {
  await withStore<IDBValidKey>(database, storeName, 'readwrite', (store) =>
    store.put(value as unknown as object, key),
  );
}

/** キー指定で 1 件削除する。 */
export async function deleteRecord(
  database: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  await withStore<undefined>(database, storeName, 'readwrite', (store) => store.delete(key));
}
