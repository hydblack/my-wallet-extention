/**
 * 代币与交易相关类型
 *
 * 定义 ERC 标准代币及链上交易的数据结构。
 */

/** ERC 代币标准 */
export type TokenStandard = 'ERC20' | 'ERC721' | 'ERC1155';

/** 代币信息 */
export interface Token {
  /** 合约地址 */
  address: string;
  /** 代币符号，例如 "USDC" */
  symbol: string;
  /** 代币完整名称 */
  name: string;
  /** 小数位数（ERC20），ERC721/1155 通常为 0 */
  decimals: number;
  /** 代币标准 */
  type: TokenStandard;
  /** 当前余额（字符串形式，单位为最小精度单位） */
  balance?: string;
  /** NFT tokenId（ERC721/ERC1155 专用） */
  tokenId?: string;
  /** 代币图标 URL */
  image?: string;
}

/** 交易类型 */
export type TransactionType = 'send' | 'receive';

/** 交易状态 */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/** 链上交易记录 */
export interface Transaction {
  /** 交易哈希 */
  hash: string;
  /** 发送方地址 */
  from: string;
  /** 接收方地址 */
  to: string;
  /** 转账金额（wei，字符串形式） */
  value: string;
  /** Gas 上限 */
  gasLimit: string;
  /** Gas 价格（wei） */
  gasPrice: string;
  /** 附带的 calldata */
  data?: string;
  /** 交易方向 */
  type: TransactionType;
  /** 交易状态 */
  status: TransactionStatus;
  /** 发生时间戳（Unix 秒） */
  timestamp: number;
  /** 代币合约地址（代币转账时存在） */
  tokenAddress?: string;
  /** 代币符号（代币转账时存在） */
  tokenSymbol?: string;
}
