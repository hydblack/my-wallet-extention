/**
 * DApp 通信相关类型
 *
 * 定义 DApp 与钱包之间通信的数据结构，
 * 涵盖 EIP-1102 和 EIP-747 标准。
 */

/** DApp 发起的 JSON-RPC 请求 */
export interface DappRequest {
  /** 请求唯一 ID */
  id: string;
  /** JSON-RPC 方法名 */
  method: string;
  /** 方法参数列表 */
  params: unknown[];
  /** 请求来源（页面 origin） */
  origin: string;
  /** 请求发起时间戳（Unix 毫秒） */
  timestamp: number;
}

// ─── EIP-1102: eth_requestAccounts ────────────────────────────────────────

/** EIP-1102 请求账户参数 */
export interface EthRequestAccountsParams {
  method: 'eth_requestAccounts';
  params: [];
}

// ─── EIP-747: wallet_watchAsset ───────────────────────────────────────────

/** EIP-747 监听资产的代币选项 */
export interface WatchAssetOptions {
  /** 合约地址 */
  address: string;
  /** 代币符号 */
  symbol: string;
  /** 小数位数（ERC20 必填） */
  decimals?: number;
  /** 图标 URL */
  image?: string;
  /** NFT tokenId（ERC721/ERC1155 专用） */
  tokenId?: string;
}

/** EIP-747 监听资产请求参数 */
export interface WatchAssetParams {
  method: 'wallet_watchAsset';
  params: {
    type: 'ERC20' | 'ERC721' | 'ERC1155';
    options: WatchAssetOptions;
  };
}

// ─── 消息桥通信协议 ────────────────────────────────────────────────────────

/** 注入脚本向消息桥发送的消息结构 */
export interface BridgeMessage {
  /** 消息类型（对应 WALLET_* 常量） */
  type: string;
  /** 唯一请求 ID，用于匹配响应 */
  requestId: string;
  /** 消息来源标识 */
  from: string;
  /** 附加数据（可选） */
  data?: Record<string, unknown>;
}

/** 消息桥向注入脚本回传的响应结构 */
export interface BridgeResponse {
  /** 来源标识（固定为 'message-bridge'） */
  from: string;
  /** 对应的请求 ID */
  requestId: string;
  /** 是否处理成功 */
  success: boolean;
  /** 成功时的返回数据 */
  data?: Record<string, unknown>;
  /** 失败时的错误信息 */
  error?: string;
}

// ─── EIP-1193: Ethereum Provider ──────────────────────────────────────────

/** EIP-1193 兼容的 Ethereum Provider 接口（MetaMask 风格） */
export interface EthereumProvider {
  /** 标识是否为 myWallet 注入的 Provider */
  isMyWallet?: boolean;
  /** 当前选中账户地址（已连接时存在） */
  selectedAddress: string | null;
  /** 当前链 ID（十六进制字符串，如 "0x1"） */
  chainId: string | null;
  /** 当前网络版本（十进制字符串） */
  networkVersion: string | null;
  /**
   * 发送 JSON-RPC 请求
   *
   * @param request 请求对象，包含 method 和可选的 params
   */
  request(request: { method: string; params?: unknown[] }): Promise<unknown>;
  /**
   * 订阅 Provider 事件
   *
   * @param event 事件名，如 "accountsChanged"、"chainChanged"
   * @param handler 事件处理函数
   */
  on(event: string, handler: (...args: unknown[]) => void): void;
  /**
   * 取消订阅 Provider 事件
   *
   * @param event 事件名
   * @param handler 事件处理函数
   */
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}
