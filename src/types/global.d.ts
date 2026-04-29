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
    connect: () => Promise<import('./account').WalletAccount>;
    getAccount: () => Promise<import('./account').WalletAccount | null>;
    signMessage: (message: string) => Promise<string>;
    disconnect: () => Promise<void>;
  };
  /** 注入标记，存在则说明 myWallet 已经注入，防止重复注入 */
  myWalletInjected?: boolean;
  /** 兼容 MetaMask 的 ethereum Provider（由 dappProvider 注入） */
  ethereum?: import('./dapp').EthereumProvider;
  /** myWallet 专属 Provider */
  mywallet?: import('./dapp').EthereumProvider;
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
