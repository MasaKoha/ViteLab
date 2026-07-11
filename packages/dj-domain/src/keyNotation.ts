/**
 * Camelot 表記（"4A"）⇄ 純正キー表記（"Fm"）の相互変換。
 * 純正キーの表記ゆれ（"F min" や ♯/♭ の "#"/"b"）は "Fm" / "b" 表記に統一する。
 * dj-tracklist の keyNotation と ViewerStudioForNP2 の formatKey を統合した実装。
 * OpenKey 記法は両抽出元とも実体を持たないため意図的に未サポート（将来 KeyNotation に追加可能な型設計にとどめる）。
 */

/** 出力時のキー表記選択。Track.key は常に Camelot で正規化保持する。 */
export type KeyNotation = 'camelot' | 'musical';

/** Camelot → 純正キー（マイナーは "m" サフィックス、♭は "b" 表記）。 */
const CAMELOT_TO_MUSICAL: Record<string, string> = {
  '1A': 'Abm',
  '1B': 'B',
  '2A': 'Ebm',
  '2B': 'Gb',
  '3A': 'Bbm',
  '3B': 'Db',
  '4A': 'Fm',
  '4B': 'Ab',
  '5A': 'Cm',
  '5B': 'Eb',
  '6A': 'Gm',
  '6B': 'Bb',
  '7A': 'Dm',
  '7B': 'F',
  '8A': 'Am',
  '8B': 'C',
  '9A': 'Em',
  '9B': 'G',
  '10A': 'Bm',
  '10B': 'D',
  '11A': 'Gbm',
  '11B': 'A',
  '12A': 'Dbm',
  '12B': 'E',
};

/** シャープ音名を ♭ 表記へ寄せる正規化表（表記ゆれ吸収）。 */
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
  'E#': 'F',
  'B#': 'C',
};

/** 純正キー（正規化済み "Fm" 形式）→ Camelot の逆引き表。 */
const MUSICAL_TO_CAMELOT: Record<string, string> = Object.fromEntries(
  Object.entries(CAMELOT_TO_MUSICAL).map(([camelot, musical]) => [musical, camelot]),
);

const CAMELOT_PATTERN = /^([0-9]|1[0-2])[AB]$/i;

/** Camelot 表記かどうかを判定する（例 "4A", "12B"）。 */
export function isCamelot(value: string): boolean {
  return CAMELOT_PATTERN.test(value.trim());
}

/**
 * 純正キー文字列を "Fm"（マイナー）/ "F"（メジャー）の正規形に寄せる。
 * "F min" / "F#m" / "Gbm" 等の表記ゆれを吸収する。判定不能なら null。
 */
function normalizeMusical(value: string): string | null {
  const trimmed = value.trim();
  // 音名（A–G + 任意の #/b）を先頭から取り出す
  const match = /^([A-Ga-g])([#b♯♭]?)/.exec(trimmed);
  if (!match) {
    return null;
  }
  const letter = match[1]!.toUpperCase();
  const accidentalRaw = match[2] ?? '';
  const accidental = accidentalRaw === '♯' ? '#' : accidentalRaw === '♭' ? 'b' : accidentalRaw;
  let note = letter + accidental;
  if (accidental === '#') {
    note = SHARP_TO_FLAT[note] ?? note;
  }
  // マイナー判定: 音名以降に m / min / minor が含まれるか
  const rest = trimmed.slice(match[0].length).toLowerCase();
  const isMinor = /\bmin(or)?\b/.test(rest) || rest.startsWith('m');
  return isMinor ? `${note}m` : note;
}

/**
 * 任意のキー表記を Camelot 正規形へ変換する。
 * Camelot はそのまま大文字化、純正キーは変換表で解決。解決不能なら入力を trim して返す。
 */
export function normalizeToCamelot(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  if (isCamelot(trimmed)) {
    return trimmed.toUpperCase();
  }
  const musical = normalizeMusical(trimmed);
  if (musical && MUSICAL_TO_CAMELOT[musical]) {
    return MUSICAL_TO_CAMELOT[musical]!;
  }
  return trimmed;
}

/** Camelot → 純正キー。未知の入力はそのまま返す。 */
export function camelotToMusical(camelot: string): string {
  return CAMELOT_TO_MUSICAL[camelot.trim().toUpperCase()] ?? camelot;
}

/**
 * Track.key（Camelot 正規形）を指定表記へ解決する。
 * camelot ならそのまま、musical なら純正キーへ変換する。
 */
export function resolveKey(key: string | undefined, notation: KeyNotation): string {
  if (!key) {
    return '';
  }
  if (notation === 'camelot') {
    return key;
  }
  return camelotToMusical(key);
}
