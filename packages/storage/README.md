# @vitelab/storage

A low-level IndexedDB Promise wrapper plus `defineStore`, a typed key-value store factory. It unifies three near-identical IndexedDB implementations (SyncImageDeck / ViewerStudioForNP2 / dj-tracklist) that had drifted apart in connection caching, transaction-completion handling, and error messages.

Key behaviors:

- **Connection caching** — the first opened connection is cached per process and reused; `open`/`close` is not repeated on every call.
- **Commit-complete resolution** — write helpers resolve only after the transaction commits (`transaction.oncomplete`), not merely after `request.onsuccess`, so callers can rely on writes being durably applied.
- **Boundary guarding** — `defineStore` runs a type guard on every read; records that fail are treated as `undefined` (single reads) or filtered out (bulk reads).

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

## High-level API: `defineStore`

For most use cases, prefer `defineStore` over the low-level helpers. It reproduces three repository shapes with one factory: in-line key (keyPath) stores, out-of-line key stores (e.g. image `Blob` keyed by hash), and plain KV settings stores.

### `StoreDefinition<TValue>`

```ts
interface StoreDefinition<TValue> {
  /** Passed straight to openDatabase. */
  readonly database: DatabaseConfig;
  /** Target object store name; must be created in database.upgrade. */
  readonly storeName: string;
  /** Read-time boundary guard. Records that fail are dropped (undefined / filtered out). */
  readonly guard: (value: unknown) => value is TValue;
  /** keyPath name for in-line key stores. Omit for out-of-line key stores (use saveWithKey). */
  readonly keyPath?: string;
}
```

### `defineStore<TValue, TKey extends IDBValidKey = IDBValidKey>(definition): TypedStore<TValue, TKey>`

Creates a typed store. Connections are opened lazily on first access via `openDatabase(definition.database)`.

### `TypedStore<TValue, TKey>`

| Method                                                 | Description                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `save(value: TValue): Promise<void>`                   | In-line key stores only: the key is derived from the value's `keyPath`. Throws if the store was defined **without** `keyPath`. |
| `saveWithKey(key: TKey, value: TValue): Promise<void>` | Out-of-line key stores: the key is supplied explicitly.                                                                        |
| `load(key: TKey): Promise<TValue \| undefined>`        | Reads one record. Returns `undefined` if missing or if it fails the guard.                                                     |
| `loadAll(): Promise<TValue[]>`                         | Returns all guard-passing records; corrupt ones are excluded.                                                                  |
| `loadAllKeys(): Promise<TKey[]>`                       | Returns all keys without reading heavy values.                                                                                 |
| `remove(key: TKey): Promise<void>`                     | Deletes one record by key.                                                                                                     |

#### In-line key store (keyPath)

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

#### Out-of-line key store (Blob by hash)

```ts
const images = defineStore<Blob, string>({
  database: {
    name: 'sync-image-deck',
    version: 1,
    upgrade: (db) => {
      db.createObjectStore('images'); // no keyPath
    },
  },
  storeName: 'images',
  guard: (v): v is Blob => v instanceof Blob,
});

await images.saveWithKey('sha256:abc…', blob);
const keys = await images.loadAllKeys();
```

## Low-level API

Use these when you need direct control over transactions rather than `defineStore`.

### `DatabaseConfig`

```ts
interface DatabaseConfig {
  /** IndexedDB database name. */
  readonly name: string;
  /** Schema version; bump and migrate in upgrade when adding stores. */
  readonly version: number;
  /** Called on onupgradeneeded to create/update object stores. */
  readonly upgrade: (database: IDBDatabase, oldVersion: number) => void;
}
```

### `openDatabase(config: DatabaseConfig): Promise<IDBDatabase>`

Opens (or returns the cached) database connection. The first connection is cached per process by name and reused. Rejects on `onerror` and when an upgrade is `onblocked` by another open connection.

### `resetDatabaseConnectionForTesting(): void`

Clears the cached connection. Call in `beforeEach` alongside a fake-indexeddb reset so a stale connection does not leak between tests. Also re-exported from `@vitelab/storage` and, historically, from a dedicated testing entry point.

### `withStore<T>(database, storeName, mode, operation): Promise<T>`

Runs a single-store operation inside one transaction. It captures the `IDBRequest` result but resolves only after `transaction.oncomplete`, guaranteeing the write is committed. Rejects on request error, transaction error, or abort.

```ts
const value = await withStore<Deck | undefined>(db, 'decks', 'readonly', (store) =>
  store.get('deck-1'),
);
```

### Record helpers

| Function                                                              | Description                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `getRecord<T>(database, storeName, key): Promise<T \| undefined>`     | Gets one record by key; `undefined` if absent.         |
| `getAllRecords<T>(database, storeName): Promise<T[]>`                 | Gets all records in the store.                         |
| `getAllKeys(database, storeName): Promise<IDBValidKey[]>`             | Gets all keys without reading heavy values.            |
| `putRecord<T>(database, storeName, value): Promise<void>`             | For keyPath stores: the key is derived from the value. |
| `putRecordWithKey<T>(database, storeName, key, value): Promise<void>` | For out-of-line key stores: key supplied explicitly.   |
| `deleteRecord(database, storeName, key): Promise<void>`               | Deletes one record by key.                             |

```ts
const db = await openDatabase(config);
await putRecord(db, 'decks', { id: 'deck-1', name: 'Warm-up' });
const one = await getRecord<Deck>(db, 'decks', 'deck-1');
const many = await getAllRecords<Deck>(db, 'decks');
await deleteRecord(db, 'decks', 'deck-1');
```

## Testing

`db.ts`'s connection cache persists across test cases, so reset it between tests:

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

## License

[MIT](../../LICENSE) © 2026 MasaKoha
