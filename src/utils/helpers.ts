/**
 * 通用工具函数
 *
 * 提供项目中复用的工具方法，包括：
 * - 唯一 ID 生成
 * - 地址格式化
 * - 金额格式化
 * - 其他通用辅助函数
 */

// ─── ID / 随机数 ──────────────────────────────────────────────────────────

/**
 * 生成一个短随机请求 ID（time36 + random5）
 *
 * @example
 * generateRequestId() // => "lf3k2abc1"
 */
export function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── 地址工具 ─────────────────────────────────────────────────────────────

/**
 * 将以太坊地址缩短为 "0x1234…abcd" 格式
 *
 * @param address 完整以太坊地址
 * @param prefixLen 前缀保留字符数（不含 0x），默认 4
 * @param suffixLen 后缀保留字符数，默认 4
 */
export function shortenAddress(
  address: string,
  prefixLen = 4,
  suffixLen = 4
): string {
  if (!address || address.length < prefixLen + suffixLen + 2) return address;
  return `${address.slice(0, prefixLen + 2)}…${address.slice(-suffixLen)}`;
}

// ─── 金额工具 ─────────────────────────────────────────────────────────────

/**
 * 将 wei（BigInt / string）转换为 ETH 字符串，保留 `decimals` 位小数
 *
 * @param wei    wei 数量（字符串或 bigint）
 * @param decimals 小数位数，默认 4
 */
export function weiToEth(wei: string | bigint, decimals = 4): string {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei);
  const eth = Number(value) / 1e18;
  return eth.toFixed(decimals);
}

// ─── 错误处理 ─────────────────────────────────────────────────────────────

/**
 * 安全地从 unknown 类型的 catch 变量提取错误消息
 *
 * @param error catch 到的未知错误
 * @param fallback 默认错误消息
 */
export function getErrorMessage(error: unknown, fallback = '未知错误'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

// ─── 时间工具 ─────────────────────────────────────────────────────────────

/**
 * 将 Unix 时间戳（秒）格式化为本地日期时间字符串
 *
 * @param timestamp Unix 时间戳（秒）
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}
