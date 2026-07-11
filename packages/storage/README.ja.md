# @vitelab/storage

[English](README.md)

低レベルな IndexedDB Promise ラッパーと、型付きの key-value ストアファクトリ `defineStore`。接続キャッシュ・トランザクション完了処理・エラーメッセージの点で乖離していた 3 つのほぼ同一な IndexedDB 実装（SyncImageDeck / ViewerStudioForNP2 / dj-tracklist）を統合したもの。

主な挙動:

- **接続キャッシュ** — 最初に開いた接続をプロセスごとにキャッシュして再利用する。呼び出しのたびに `open`/`close` を繰り返さない。
- **コミット完了での解決** — 書き込みヘルパーは `request.onsuccess` だけでなくトランザクションのコミット（`transaction.oncomplete`）後に初めて解決する。そのため呼び出し側は書き込みが確実に反映されたことに依存できる。
- **境界ガード** — `defineStore` は読み取りのたびに型ガードを実行する。失敗したレコードは `undefined`（単一読み取り）扱い、またはフィルタで除外（一括読み取り）される。

```ts
import {
  type DatabaseConfig,
  openDatabase,
  resetDatabaseConnectionForTesting,
  withStore,
  getRecord,
  getAllRecords,
  getAllKeys,
  putRecord,
  putRecordWithKey,
  deleteRecord,
  type StoreDefinition,
  type TypedStore,
  defineStore,
} from '@vitelab/storage';
```

## 高レベル API: `defineStore`

ほとんどのユースケースでは低レベルヘルパーより `defineStore` を優先すべき。1 つのファクトリで 3 つのリポジトリ形態を再現できる。インラインキー（keyPath）ストア、アウトオブラインキーストア（例: ハッシュをキーにした画像 `Blob`）、そして素の KV 設定ストアである。

### `StoreDefinition<TValue>`

```ts
interface StoreDefinition<TValue> {
  /** そのまま openDatabase に渡される。 */
  readonly database: DatabaseConfig;
  /** 対象のオブジェクトストア名。database.upgrade で作成しておく必要がある。 */
  readonly storeName: string;
  /** 読み取り時の境界ガード。失敗したレコードは破棄される（undefined / フィルタ除外）。 */
  readonly guard: (value: unknown) => value is TValue;
  /** インラインキーストアの keyPath 名。アウトオブラインキーストアでは省略する（saveWithKey を使う）。 */
  readonly keyPath?: string;
}
```

### `defineStore<TValue, TKey extends IDBValidKey = IDBValidKey>(definition): TypedStore<TValue, TKey>`

型付きストアを生成する。接続は初回アクセス時に `openDatabase(definition.database)` を通じて遅延オープンされる。

### `TypedStore<TValue, TKey>`

| メソッド                                                 | 説明                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `save(value: TValue): Promise<void>`                   | インラインキーストア専用。キーは値の `keyPath` から導出される。`keyPath` **なし**で定義されたストアでは例外を投げる。 |
| `saveWithKey(key: TKey, value: TValue): Promise<void>` | アウトオブラインキーストア用。キーを明示的に指定する。                                                              |
| `load(key: TKey): Promise<TValue \| undefined>`        | 1 件のレコードを読む。存在しない場合、またはガードに失敗した場合は `undefined` を返す。                             |
| `loadAll(): Promise<TValue[]>`                         | ガードを通過した全レコードを返す。破損したものは除外される。                                                        |
| `loadAllKeys(): Promise<TKey[]>`                       | 重い値を読み込まずに全キーを返す。                                                                                 |
| `remove(key: TKey): Promise<void>`                     | キーで 1 件のレコードを削除する。                                                                                  |

#### インラインキーストア（keyPath）

```ts
interface Deck {
  id: string;
  name: string;
}

const decks = defineStore<Deck, string>({
  database: {
    name: 'sync-image-deck',
    version: 1,
    upgrade: (db) => {
      db.createObjectStore('decks', { keyPath: 'id' });
    },
  },
  storeName: 'decks',
  keyPath: 'id',
  guard: (v): v is Deck =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Deck).id === 'string' &&
    typeof (v as Deck).name === 'string',
});

await decks.save({ id: 'deck-1', name: 'Warm-up' });
const deck = await decks.load('deck-1');
const all = await decks.loadAll();
await decks.remove('deck-1');
```

#### アウトオブラインキーストア（ハッシュをキーにした Blob）

```ts
const images = defineStore<Blob, string>({
  database: {
    name: 'sync-image-deck',
    version: 1,
    upgrade: (db) => {
      db.createObjectStore('images'); // keyPath なし
    },
  },
  storeName: 'images',
  guard: (v): v is Blob => v instanceof Blob,
});

await images.saveWithKey('sha256:abc…', blob);
const keys = await images.loadAllKeys();
```

## 低レベル API

`defineStore` ではなくトランザクションを直接制御したい場合に使う。

### `DatabaseConfig`

```ts
interface DatabaseConfig {
  /** IndexedDB データベース名。 */
  readonly name: string;
  /** スキーマバージョン。ストア追加時はバージョンを上げて upgrade でマイグレートする。 */
  readonly version: number;
  /** onupgradeneeded で呼ばれ、オブジェクトストアの作成・更新を行う。 */
  readonly upgrade: (database: IDBDatabase, oldVersion: number) => void;
}
```

### `openDatabase(config: DatabaseConfig): Promise<IDBDatabase>`

データベース接続を開く（またはキャッシュ済みの接続を返す）。最初の接続は名前ごとにプロセス単位でキャッシュされ、再利用される。`onerror` の場合、および他の開いている接続によってアップグレードが `onblocked` された場合は reject する。

### `resetDatabaseConnectionForTesting(): void`

キャッシュした接続をクリアする。fake-indexeddb のリセットと合わせて `beforeEach` で呼び、古い接続がテスト間でリークしないようにする。`@vitelab/storage` から再エクスポートされており、歴史的には専用のテスト用エントリポイントからも公開されていた。

### `withStore<T>(database, storeName, mode, operation): Promise<T>`

単一ストアの操作を 1 つのトランザクション内で実行する。`IDBRequest` の結果を捕捉するが、解決は `transaction.oncomplete` の後にのみ行い、書き込みがコミットされたことを保証する。リクエストエラー・トランザクションエラー・abort の場合は reject する。

```ts
const value = await withStore<Deck | undefined>(db, 'decks', 'readonly', (store) =>
  store.get('deck-1'),
);
```

### レコードヘルパー

| 関数                                                                  | 説明                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `getRecord<T>(database, storeName, key): Promise<T \| undefined>`     | キーで 1 件のレコードを取得する。無ければ `undefined`。   |
| `getAllRecords<T>(database, storeName): Promise<T[]>`                 | ストア内の全レコードを取得する。                          |
| `getAllKeys(database, storeName): Promise<IDBValidKey[]>`             | 重い値を読み込まずに全キーを取得する。                    |
| `putRecord<T>(database, storeName, value): Promise<void>`             | keyPath ストア用。キーは値から導出される。                |
| `putRecordWithKey<T>(database, storeName, key, value): Promise<void>` | アウトオブラインキーストア用。キーを明示的に指定する。     |
| `deleteRecord(database, storeName, key): Promise<void>`               | キーで 1 件のレコードを削除する。                         |

```ts
const db = await openDatabase(config);
await putRecord(db, 'decks', { id: 'deck-1', name: 'Warm-up' });
const one = await getRecord<Deck>(db, 'decks', 'deck-1');
const many = await getAllRecords<Deck>(db, 'decks');
await deleteRecord(db, 'decks', 'deck-1');
```

## テスト

`db.ts` の接続キャッシュはテストケースをまたいで保持されるため、テスト間でリセットする。

```ts
import { beforeEach } from 'vitest';
import { resetDatabaseConnectionForTesting } from '@vitelab/storage';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseConnectionForTesting();
});
```

## ライセンス

[MIT](../../LICENSE) © 2026 MasaKoha
