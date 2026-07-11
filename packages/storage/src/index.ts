/**
 * @vitelab/storage — IndexedDB の低レベルラッパーと型付き KV ストア生成器。
 * 3 プロジェクト（SyncImageDeck / ViewerStudioForNP2 / dj-tracklist）が各自実装していた
 * IndexedDB Promise ラッパーを統一し、defineStore で型付きリポジトリを宣言的に生成できるようにする。
 */

export {
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
} from './db.js';

export { type StoreDefinition, type TypedStore, defineStore } from './defineStore.js';
