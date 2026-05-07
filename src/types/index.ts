/**
 * types 统一出口
 *
 * 从这里按需导入所有类型：
 *   import type { WalletAccount, Network, Token } from '../types';
 *
 * 各子模块职责：
 *   account  - 账户相关类型（WalletAccount）
 *   network  - 网络相关类型（Network）
 *   token    - 代币与交易类型（Token, Transaction, ...）
 *   store    - 钱包状态类型（WalletState）
 *   dapp     - DApp 通信类型（DappRequest, BridgeMessage, EthereumProvider, ...）
 */

export type { WalletAccount } from './account';
export type { Network } from './network';
export type {
  TokenStandard,
  Token,
  TransactionType,
  TransactionStatus,
  Transaction,
} from './token';
export type { WalletState } from './store';
export type {
  DappRequest,
  EthRequestAccountsParams,
  WatchAssetOptions,
  WatchAssetParams,
  BridgeMessage,
  BridgeResponse,
  EthereumProvider,
} from './dapp';
export type {
  TransactionRequest,
  TransactionStatus,
  TransactionRecord,
} from './transaction';
