/**
 * 交易请求相关类型
 *
 * 定义 DApp 交易请求、交易记录等数据结构。
 */

/** DApp 发起的交易请求参数 */
export interface TransactionRequest {
  from?: string;
  to?: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId?: number;
  nonce?: number;
}

/** 交易状态 */
export type TransactionStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

/** 交易记录（用于活动列表） */
export interface TransactionRecord {
  /** 请求唯一 ID */
  requestId: string;
  /** 请求方法 (eth_sendTransaction / personal_sign 等) */
  method: string;
  /** 交易参数 */
  tx: TransactionRequest;
  /** 交易状态 */
  status: TransactionStatus;
  /** 请求时间戳 */
  timestamp: number;
  /** 交易哈希（确认后生成） */
  hash?: string;
  /** DApp 来源 (origin) */
  origin?: string;
  /** 错误信息（失败/拒绝时） */
  error?: string;
  /** Gas 费用估算 (ETH) */
  estimatedGasFee?: string;
  /** Gas Limit */
  estimatedGasLimit?: string;
}
