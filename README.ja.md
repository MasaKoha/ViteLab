# ViteLab

[English](README.md)

Vite ベースの Web アプリ向けに共有する TypeScript ユーティリティ群。依存ゼロの core ヘルパー、型付き IndexedDB ストレージ層、DJ トラックリストのドメインロジックで構成される。複数の個人プロジェクト（SyncImageDeck、ViewerStudioForNP2、dj-tracklist）から抽出し、コピペされたコードを排除してアプリ間で挙動を統一することを目的としている。

このモノレポは素の npm workspace で構成され、`tsc -b` の Project References でビルドし、Vitest でテストする。各パッケージは型宣言付きの ESM のみを提供する。

## パッケージ

| パッケージ                                  | 説明                                                                                                                       | ドキュメント                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| [`@vitelab/core`](packages/core)           | 依存ゼロのヘルパー群。時刻フォーマット、base64 / エンコーディング判定、テキスト正規化、数値演算、色（RGB/HSL、アクセントカラー抽出）。 | [README](packages/core/README.ja.md)      |
| [`@vitelab/storage`](packages/storage)     | 低レベルな IndexedDB Promise ラッパーと、型付きの key-value ストアファクトリ `defineStore`。                                 | [README](packages/storage/README.ja.md)   |
| [`@vitelab/dj-domain`](packages/dj-domain) | DJ トラックリストのドメイン。Camelot / 音名のキー表記、共通の `Track` モデル、rekordbox TSV / m3u8 パーサー。                | [README](packages/dj-domain/README.ja.md) |

依存の向き: `dj-domain` → `core`。`storage` は独立している。

## 動作要件

- Node.js 20+
- npm 10+（workspaces）

## インストール

パッケージはまだレジストリに公開していない。この workspace 内でソースから利用するか、GitHub から直接インストールする。

```bash
# このリポジトリ内で
npm install

# 別プロジェクトから（Git 依存）
npm install github:MasaKoha/ViteLab#main --workspace-pattern packages/core
```

workspace にインストールした後は、パッケージ名でインポートする。

```ts
import { formatClock, hexToRgb } from '@vitelab/core';
import { defineStore } from '@vitelab/storage';
import { parseInput, resolveKey } from '@vitelab/dj-domain';
```

## 使い方の概要

```ts
import { decodeArrayBuffer } from '@vitelab/core';
import { parseInput, resolveKey } from '@vitelab/dj-domain';

// 1. rekordbox TSV（UTF-16LE + BOM）や m3u8（UTF-8）ファイルをエンコーディング自動判定でデコードする。
const text = decodeArrayBuffer(await file.arrayBuffer());

// 2. 正規化した Track リストへパースする。フォーマットは自動判定される。
const result = parseInput(text);
if (result) {
  for (const track of result.tracks) {
    // Track.key は常に Camelot 表記で保持される。表示は好きな形式に変換できる。
    console.log(track.artist, track.title, resolveKey(track.key, 'musical'));
  }
}
```

```ts
import { defineStore } from '@vitelab/storage';

interface Deck {
  id: string;
  name: string;
}

const decks = defineStore<Deck>({
  database: {
    name: 'my-app',
    version: 1,
    upgrade: (db) => db.createObjectStore('decks', { keyPath: 'id' }),
  },
  storeName: 'decks',
  keyPath: 'id',
  guard: (v): v is Deck =>
    typeof v === 'object' && v !== null && typeof (v as Deck).id === 'string',
});

await decks.save({ id: 'a', name: 'Warm-up' });
const all = await decks.loadAll();
```

## 開発

```bash
npm install          # workspace の依存をインストール
npm run build        # tsc -b（全パッケージ）
npm test             # vitest run
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run format       # prettier -w .
```

CI（GitHub Actions）は push と pull request のたびに `typecheck`、`lint`、`test` を実行する。

## コントリビュート

[CONTRIBUTING.md](CONTRIBUTING.md) を参照。

## ライセンス

[MIT](LICENSE) © 2026 MasaKoha
