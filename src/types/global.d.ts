/**
 * 全局类型扩展
 *
 * 扩展浏览器全局对象，声明注入到 window 的钱包对象，
 * 以及 CSS Module 的类型支持。
 */

// ─── Window 对象扩展 ──────────────────────────────────────────────────────

declare interface Window {
  /** 注入到页面的 myWallet 对象（由 injected-helper 注入） */
  myWallet?: {
    /** EIP-1193 标识 */
    isMyWallet: true;
    /** 当前选中账户地址 */
    selectedAddress: string | null;
    /** 当前链 ID（十六进制字符串） */
    chainId: string | null;

    /** 连接钱包，返回当前账户信息 */
    connect: () => Promise<import('./account').WalletAccount>;
    /** 获取当前账户信息 */
    getAccount: () => Promise<import('./account').WalletAccount | null>;
    /** 对消息进行签名 */
    signMessage: (message: string) => Promise<string>;
    /** 断开钱包连接 */
    disconnect: () => Promise<void>;
    /** 发起交易请求 */
    sendTransaction: (tx: any) => Promise<string>;

    /** EIP-1193 request 方法 */
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    /** EIP-1193 注册事件监听 */
    on: (event: string, handler: (...args: any[]) => void) => any;
    /** EIP-1193 移除事件监听 */
    removeListener: (event: string, handler: (...args: any[]) => void) => any;
  };
  /** 注入标记，存在则说明 myWallet 已经注入，防止重复注入 */
  myWalletInjected?: boolean;
}

// ─── CSS Module ────────────────────────────────────────────────────────────

declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

// ─── 静态资源 ─────────────────────────────────────────────────────────────

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
