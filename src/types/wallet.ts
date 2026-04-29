/**
 * wallet.ts — 向后兼容的重导出文件
 *
 * 原 wallet.ts 中的类型和常量已迁移到以下位置：
 *   - 类型 → src/types/account.ts / network.ts / token.ts / store.ts / dapp.ts
 *   - 常量 → src/utils/constants.ts
 *
 * 此文件保留以兼容现有的 `import ... from '../types/wallet'` 语句。
 * 建议逐步将导入路径更新为具体模块路径。
 *
 * @deprecated 请直接从 '../types' 或具体子模块导入
 */

export type { WalletAccount } from './account';
export type { Network } from './network';
export type { Token, TokenStandard, Transaction, TransactionType, TransactionStatus } from './token';
export type { WalletState } from './store';
export type { DappRequest, EthRequestAccountsParams, WatchAssetParams } from './dapp';

// 常量重导出（保持向后兼容）
export { DEFAULT_NETWORKS } from '../utils/constants';
