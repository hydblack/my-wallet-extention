/**
 * 钱包全局状态类型
 *
 * 定义 Zustand Store 管理的钱包状态数据结构。
 */

import type { WalletAccount } from './account';
import type { Network } from './network';
import type { Token } from './token';

/** 钱包全局状态 */
export interface WalletState {
  /** 钱包是否处于锁定状态 */
  isLocked: boolean;
  /** 是否已连接 DApp */
  isConnected: boolean;
  /** 所有账户列表 */
  accounts: WalletAccount[];
  /** 当前激活账户（null 表示未选择） */
  currentAccount: WalletAccount | null;
  /** 加密后的助记词（AES 密文） */
  mnemonic: string | null;
  /** SHA256 哈希后的密码 */
  password: string | null;
  /** 当前使用的网络 */
  currentNetwork: Network;
  /** 所有已配置网络 */
  networks: Network[];
  /** 已添加的代币列表 */
  tokens: Token[];
}
