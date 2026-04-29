/**
 * 注入脚本
 *
 * 通过 chrome.scripting.executeScript 注入到页面主世界（MAIN world），
 * 在 window 上挂载 myWallet 对象，供 DApp 调用。
 *
 * 注意：此函数在独立的执行上下文中运行，无法 import 外部模块，
 * 所有依赖常量均需在函数内部定义。
 */
export default function injectMyWallet() {
  // 防止重复注入
  if (window.myWallet || window.myWalletInjected) return;

  // ─── 内联常量（与 utils/constants.ts 保持一致）────────────────────────
  const WALLET_CONNECT = 'WALLET_CONNECT';
  const WALLET_GET_ACCOUNT = 'WALLET_GET_ACCOUNT';
  const WALLET_SIGN_MESSAGE = 'WALLET_SIGN_MESSAGE';
  const WALLET_DISCONNECT = 'WALLET_DISCONNECT';
  const FROM_INJECTED = 'injected-helper';
  const FROM_BRIDGE = 'message-bridge';
  const CONNECT_TIMEOUT = 30_000;
  const SIGN_TIMEOUT = 30_000;

  // ─── 工具函数 ─────────────────────────────────────────────────────────
  /** 生成唯一请求 ID */
  function generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** 校验响应消息是否为本次请求的合法回包 */
  function isValidResponse(event: MessageEvent, requestId: string): boolean {
    return (
      event.source === window &&
      !!event.data &&
      event.data.from === FROM_BRIDGE &&
      event.data.requestId === requestId
    );
  }

  // ─── myWallet 对象 ────────────────────────────────────────────────────
  const myWallet = {
    /** 连接钱包，返回当前账户信息 */
    connect(): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        window.postMessage(
          { type: WALLET_CONNECT, requestId, from: FROM_INJECTED },
          '*'
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);
          if (event.data.success) {
            resolve(event.data.data.account);
          } else {
            reject(event.data.error || '连接失败');
          }
        };

        window.addEventListener('message', handleResponse);
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject('连接超时');
        }, CONNECT_TIMEOUT);
      });
    },

    /** 获取当前账户信息 */
    getAccount(): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        window.postMessage(
          { type: WALLET_GET_ACCOUNT, requestId, from: FROM_INJECTED },
          '*'
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);
          if (event.data.success) {
            resolve(event.data.data.account);
          } else {
            reject(event.data.error || '获取账户信息失败');
          }
        };

        window.addEventListener('message', handleResponse);
      });
    },

    /** 对消息进行签名，返回签名结果 */
    signMessage(message: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        window.postMessage(
          {
            type: WALLET_SIGN_MESSAGE,
            data: { message },
            requestId,
            from: FROM_INJECTED,
          },
          window.location.origin
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);
          if (event.data.success) {
            resolve(event.data.data.signedMessage as string);
          } else {
            reject(event.data.error || '签名失败');
          }
        };

        window.addEventListener('message', handleResponse);
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject('签名超时');
        }, SIGN_TIMEOUT);
      });
    },

    /** 断开钱包连接 */
    disconnect(): Promise<void> {
      return new Promise((resolve) => {
        const requestId = generateRequestId();
        window.postMessage(
          { type: WALLET_DISCONNECT, requestId, from: FROM_INJECTED },
          '*'
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);
          resolve();
        };

        window.addEventListener('message', handleResponse);
      });
    },
  };

  window.myWallet = myWallet as any;
  window.myWalletInjected = true;
  console.log('✅ myWallet 已注入到页面');
}
