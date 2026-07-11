/**
 * テスト専用ユーティリティ。fake-indexeddb と組み合わせて使う。
 * db.ts の接続キャッシュはテストケースをまたいで残ると前のテストの DB を握ったままになるため、
 * 各テストの beforeEach 等でリセットしてクリーンな接続を保証する。
 */

export { resetDatabaseConnectionForTesting } from './db.js';
