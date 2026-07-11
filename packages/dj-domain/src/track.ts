/**
 * DJ トラックリストの共通ドメインモデル。
 * パーサが出力し、フォーマッタが消費する正規化トラック型と、入力形式ごとのパーサ契約を定義する。
 * 全フィールドは optional で「あるものだけ入る」前提を貫く（source により持つ情報が異なるため）。
 */

/** 正規化トラック。source 由来の生値は `_raw` に、正規化値は各名前付きフィールドに分けて保持する。 */
export interface Track {
  no?: string;
  artist?: string;
  title?: string;
  album?: string;
  bpm?: string;
  /** Camelot 表記（例 "4A"）を正規形として保持する。 */
  key?: string;
  /** マイタグ由来。空配列を許容する。 */
  tags: string[];
  /** m3u8 由来の尺（秒）。タイムスタンプ生成の源。 */
  durationSec?: number;
  /** 正規化表示 "mm:ss"。TSV は元文字列、m3u8 は秒から算出。 */
  time?: string;
  rating?: string;
  playCount?: string;
  genre?: string;
  label?: string;
  year?: string;
  remixer?: string;
  /** ローカル/クラウドの絶対パス。sanitize 対象。 */
  location?: string;
  /** ファイル名。sanitize 対象。 */
  fileName?: string;
  /** 元カラムを保持（未マップ列の保険）。 */
  _raw?: Record<string, string>;
}

/** parseInput が判別する入力形式。 */
export type SourceFormat = 'tsv' | 'm3u8';

/** parseInput の戻り値。UI はここから形式バッジと件数を表示する。 */
export interface ParseResult {
  format: SourceFormat;
  tracks: Track[];
}

/**
 * 入力形式ごとのパーサ契約。
 * 判別ロジックは各パーサの `canParse` に閉じ込め、ディスパッチャは登録順に問い合わせる。
 * 新形式の追加はパーサ実装 1 つの追加のみで済む。
 */
export interface ITrackParser {
  /** UI バッジ表示に使う形式識別子。 */
  readonly format: SourceFormat;

  /** この入力を自分が処理できるかを判定する。副作用を持たないこと。 */
  canParse(source: string): boolean;

  /** 入力文字列を正規化済み Track 配列へ変換する。 */
  parse(source: string): Track[];
}
