/**
 * 全局常量
 *
 * 统一管理项目中的所有常量，包括：
 * - 消息类型（钱包通信协议）
 * - 默认网络配置
 * - 存储键名
 * - 其他全局常量
 */

import type { Network } from '../types/wallet';

// ─── 钱包消息类型 ───────────────────────────────────────────────────────────
/** 请求连接钱包 */
export const WALLET_CONNECT = 'WALLET_CONNECT';
/** 获取当前账户信息 */
export const WALLET_GET_ACCOUNT = 'WALLET_GET_ACCOUNT';
/** 请求对消息进行签名 */
export const WALLET_SIGN_MESSAGE = 'WALLET_SIGN_MESSAGE';
/** 断开钱包连接 */
export const WALLET_DISCONNECT = 'WALLET_DISCONNECT';

// ─── 消息来源标识 ─────────────────────────────────────────────────────────
/** 注入脚本来源标识 */
export const FROM_INJECTED = 'injected-helper';
/** 桥接脚本来源标识 */
export const FROM_BRIDGE = 'message-bridge';

// ─── 存储键名 ─────────────────────────────────────────────────────────────
/** 钱包状态在 chrome.storage.local 中的键名 */
export const WALLET_STORE_KEY = 'wallet-store';

// ─── 超时时间（毫秒）────────────────────────────────────────────────────────
/** 钱包连接超时时间：30 秒 */
export const WALLET_CONNECT_TIMEOUT = 30_000;
/** 签名请求超时时间：30 秒 */
export const WALLET_SIGN_TIMEOUT = 30_000;

// ─── 默认网络配置 ──────────────────────────────────────────────────────────
export const DEFAULT_NETWORKS: Network[] = [
  {
    id: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/Hqd_61uGu4Xbq16eZ2j5N',
    chainId: 11155111,
    symbol: 'ETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/Hqd_61uGu4Xbq16eZ2j5N',
    chainId: 1,
    symbol: 'ETH',
    blockExplorerUrl: 'https://etherscan.io',
  },
  {
    id: 'polygon',
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/Hqd_61uGu4Xbq16eZ2j5N',
    chainId: 137,
    symbol: 'POL',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  {
    id: 'polygon-amoy',
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/Hqd_61uGu4Xbq16eZ2j5N',
    chainId: 80002,
    symbol: 'POL',
    blockExplorerUrl: 'https://www.oklink.com/amoy',
  },
];

// ─── HD 派生路径 ───────────────────────────────────────────────────────────
/** BIP44 以太坊账户派生基础路径 */
export const HD_DERIVATION_BASE_PATH = "m/44'/60'/0'/0";
