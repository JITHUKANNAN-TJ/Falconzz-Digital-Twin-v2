/**
 * Safe formatting utilities for aerospace telemetry and diagnostic parameters.
 * Prevents TypeError crashes when values are null, undefined, or NaN.
 */

export function formatNumber(
  val: number | null | undefined,
  decimals = 1,
  fallback = '0.0'
): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  return val.toFixed(decimals);
}

export function formatRpm(val: number | null | undefined, fallback = '0'): string {
  return formatNumber(val, 0, fallback);
}

export function formatCurrent(val: number | null | undefined, fallback = '0.00'): string {
  return formatNumber(val, 2, fallback);
}

export function formatVoltage(val: number | null | undefined, fallback = '0.00'): string {
  return formatNumber(val, 2, fallback);
}

export function formatTemp(val: number | null | undefined, fallback = '25.0'): string {
  return formatNumber(val, 1, fallback);
}

export function formatVib(val: number | null | undefined, fallback = '0.000'): string {
  return formatNumber(val, 3, fallback);
}

export function formatPower(val: number | null | undefined, fallback = '0.0'): string {
  return formatNumber(val, 1, fallback);
}

export function formatPct(val: number | null | undefined, fallback = '0.0'): string {
  return formatNumber(val, 1, fallback);
}
