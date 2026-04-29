/**
 * 网络相关类型
 *
 * 定义 EVM 兼容网络的数据结构。
 */

/** EVM 兼容网络配置 */
export interface Network {
  /** 网络唯一标识符（小写，连字符分隔），例如 "ethereum"、"polygon-amoy" */
  id: string;
  /** 网络显示名称 */
  name: string;
  /** JSON-RPC 节点 URL */
  rpcUrl: string;
  /** 链 ID（十进制整数） */
  chainId: number;
  /** 原生代币符号，例如 "ETH"、"POL" */
  symbol: string;
  /** 区块浏览器 URL（可选） */
  blockExplorerUrl?: string;
}
