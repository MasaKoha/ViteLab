/**
 * 秒数と時計表記（mm:ss / h:mm:ss）の相互変換を提供するモジュール。
 * 依存ゼロの純粋関数のみで構成する。
 */

const SecondsPerMinute = 60;
const SecondsPerHour = 3600;

/**
 * 秒を時計表記へ整形する。1時間未満は `mm:ss`、1時間以上は `h:mm:ss`。
 * 負値・非数（NaN/Infinity）は 0 として扱う。
 */
export function formatClock(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / SecondsPerHour);
  const minutes = Math.floor((safeSeconds % SecondsPerHour) / SecondsPerMinute);
  const seconds = safeSeconds % SecondsPerMinute;
  const twoDigits = (value: number): string => value.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
  }
  return `${minutes}:${twoDigits(seconds)}`;
}

// `h:mm:ss` は時間部分が任意桁、分・秒は 2 桁固定。`mm:ss` は分部分の桁数を制限しない
// （90:00 のような 60 分超の表記も許容し、時間表記との往復可能性を優先する）。
const ClockWithHoursPattern = /^(\d+):([0-5]\d):([0-5]\d)$/;
const ClockWithoutHoursPattern = /^(\d+):([0-5]\d)$/;

/**
 * `mm:ss` / `h:mm:ss` 形式の文字列を秒数へ変換する。解析できない場合は null。
 */
export function parseClock(text: string): number | null {
  const trimmed = text.trim();

  const withHours = ClockWithHoursPattern.exec(trimmed);
  if (withHours !== null) {
    const hoursText = withHours[1];
    const minutesText = withHours[2];
    const secondsText = withHours[3];
    if (hoursText === undefined || minutesText === undefined || secondsText === undefined) {
      return null;
    }
    return (
      Number(hoursText) * SecondsPerHour +
      Number(minutesText) * SecondsPerMinute +
      Number(secondsText)
    );
  }

  const withoutHours = ClockWithoutHoursPattern.exec(trimmed);
  if (withoutHours !== null) {
    const minutesText = withoutHours[1];
    const secondsText = withoutHours[2];
    if (minutesText === undefined || secondsText === undefined) {
      return null;
    }
    return Number(minutesText) * SecondsPerMinute + Number(secondsText);
  }

  return null;
}
