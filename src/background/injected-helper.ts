/**
 * 注入脚本
 *
 * 通过 chrome.scripting.executeScript 注入到页面主世界（MAIN world），
 * 在 window 上挂载 myWallet 对象，供 DApp 调用。
 *
 * 同时提供 EIP-1193 兼容的 provider 接口（request / on / removeListener），
 * 使 DApp 可以通过标准 provider.request({ method: 'eth_chainId' }) 调用只读 RPC。
 *
 * 注意：此函数在独立的执行上下文中运行，无法 import 外部模块，
 * 所有依赖常量均需在函数内部定义。
 */
export default function injectMyWallet() {
  // 防止重复注入
  if ((window as any).myWallet || (window as any).myWalletInjected) return;

  // ─── 内联常量（与 utils/constants.ts 保持一致）────────────────────────
  const WALLET_CONNECT = 'WALLET_CONNECT';
  const WALLET_GET_ACCOUNT = 'WALLET_GET_ACCOUNT';
  const WALLET_SIGN_MESSAGE = 'WALLET_SIGN_MESSAGE';
  const WALLET_DISCONNECT = 'WALLET_DISCONNECT';
  const WALLET_SEND_TRANSACTION = 'WALLET_SEND_TRANSACTION';
  const TX_CONFIRMED = 'TX_CONFIRMED';
  const TX_REJECTED = 'TX_REJECTED';
  const PROVIDER_RPC_REQUEST = 'PROVIDER_RPC_REQUEST';
  const FROM_INJECTED = 'injected-helper';
  const FROM_BRIDGE = 'message-bridge';
  const CONNECT_TIMEOUT = 30_000;
  const SIGN_TIMEOUT = 30_000;
  const TX_TIMEOUT = 300_000;
  const RPC_TIMEOUT = 10_000;

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

  // ─── EIP-1193 事件监听器 ──────────────────────────────────────────────
  const eventListeners: Record<string, Set<Function>> = {};

  function emitEvent(event: string, ...args: any[]) {
    const listeners = eventListeners[event];
    if (listeners) {
      listeners.forEach((fn) => {
        try { fn(...args); } catch (e) { console.error(`[myWallet] event "${event}" handler error:`, e); }
      });
    }
  }

  // ─── myWallet 对象 ────────────────────────────────────────────────────
  const myWallet = {
    /** EIP-1193 标识 */
    isMyWallet: true,

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

    /** 发起交易请求（需用户在钱包扩展中确认） */
    sendTransaction(tx: any): Promise<string> {
      return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        window.postMessage(
          {
            type: WALLET_SEND_TRANSACTION,
            data: { tx },
            requestId,
            from: FROM_INJECTED,
          },
          window.location.origin
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);

          if (event.data.type === TX_CONFIRMED && event.data.success) {
            resolve(event.data.data.hash as string);
          } else if (event.data.type === TX_REJECTED) {
            reject(new Error(event.data.error || '用户拒绝了交易请求'));
          } else if (event.data.success) {
            resolve(event.data.data.hash as string);
          } else {
            reject(new Error(event.data.error || '交易失败'));
          }
        };

        window.addEventListener('message', handleResponse);
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject('交易请求超时');
        }, TX_TIMEOUT);
      });
    },

    // ─── EIP-1193 Provider 接口 ─────────────────────────────────────────
    /**
     * EIP-1193 request 方法
     * 将只读 RPC 调用（eth_chainId, eth_getBalance, eth_call 等）
     * 通过 message-bridge 转发到 background，由 background 调用 RPC 节点
     */
    request(args: { method: string; params?: any[] }): Promise<any> {
      return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        window.postMessage(
          {
            type: PROVIDER_RPC_REQUEST,
            data: { method: args.method, params: args.params || [] },
            requestId,
            from: FROM_INJECTED,
          },
          window.location.origin
        );

        const handleResponse = (event: MessageEvent) => {
          if (!isValidResponse(event, requestId)) return;
          window.removeEventListener('message', handleResponse);
          if (event.data.success) {
            resolve(event.data.data);
          } else {
            const errMsg = event.data.error || 'RPC request failed';
            // EIP-1193 标准错误格式
            const error = new Error(errMsg) as any;
            error.code = event.data.code || -32603;
            reject(error);
          }
        };

        window.addEventListener('message', handleResponse);
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject(new Error('RPC request timeout'));
        }, RPC_TIMEOUT);
      });
    },

    /** EIP-1193 on - 注册事件监听 */
    on(event: string, handler: Function): any {
      if (!eventListeners[event]) {
        eventListeners[event] = new Set();
      }
      eventListeners[event].add(handler);
      return myWallet;
    },

    /** EIP-1193 removeListener - 移除事件监听 */
    removeListener(event: string, handler: Function): any {
      if (eventListeners[event]) {
        eventListeners[event].delete(handler);
      }
      return myWallet;
    },
  };

  (window as any).myWallet = myWallet;
  (window as any).myWalletInjected = true;
  console.log('✅ myWallet 已注入到页面 (EIP-1193 provider)');
}
