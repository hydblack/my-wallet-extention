/**
 * 注入脚本
 *
 * 通过 chrome.scripting.executeScript 注入到页面主世界（MAIN world），
 * 在 window 上挂载 myWallet 对象，供 DApp 调用。
 *
 * 提供完整的 EIP-1193 Provider 接口：
 * - request(): 支持 eth_requestAccounts / eth_chainId / wallet_watchAsset 等
 * - on() / removeListener(): 事件订阅（accountsChanged / chainChanged）
 * - connect() / disconnect() / signMessage() / sendTransaction(): 自定义 API
 *
 * 通信链路：injected-helper => message-bridge => background
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
  const WALLET_WATCH_ASSET = 'WALLET_WATCH_ASSET';
  const WALLET_ADD_ETHEREUM_CHAIN = 'WALLET_ADD_ETHEREUM_CHAIN';
  const WALLET_SWITCH_ETHEREUM_CHAIN = 'WALLET_SWITCH_ETHEREUM_CHAIN';
  const WALLET_SIGN = 'WALLET_SIGN';
  const WALLET_SIGN_TYPED_DATA = 'WALLET_SIGN_TYPED_DATA';
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

  /** 发送请求到 background 并等待响应 */
  function sendToBackground(type: string, data?: any, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();
      window.postMessage(
        { type, requestId, from: FROM_INJECTED, data },
        window.location.origin
      );

      const handleResponse = (event: MessageEvent) => {
        if (!isValidResponse(event, requestId)) return;
        window.removeEventListener('message', handleResponse);
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || 'Request failed'));
        }
      };

      window.addEventListener('message', handleResponse);
      if (timeout) {
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Request timeout'));
        }, timeout);
      }
    });
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

  // ─── 缓存状态 ─────────────────────────────────────────────────────────
  let _selectedAddress: string | null = null;
  let _chainId: string | null = null;

  /** 刷新缓存状态（通过 RPC 读取链 ID） */
  async function refreshState() {
    try {
      const chainId = await sendToBackground(PROVIDER_RPC_REQUEST, { method: 'eth_chainId', params: [] });
      _chainId = chainId as string;
    } catch {
      _chainId = null;
    }
  }

  // ─── myWallet 对象 ────────────────────────────────────────────────────
  const myWallet = {
    /** EIP-1193 标识 */
    isMyWallet: true,

    /** 当前选中账户地址（EIP-1193 兼容） */
    get selectedAddress() { return _selectedAddress; },

    /** 当前链 ID（十六进制字符串，EIP-1193 兼容） */
    get chainId() { return _chainId; },

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
            const account = event.data.data.account;
            _selectedAddress = account?.address || null;
            emitEvent('accountsChanged', [_selectedAddress]);
            resolve(account);
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
      return sendToBackground(WALLET_GET_ACCOUNT);
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
          _selectedAddress = null;
          emitEvent('accountsChanged', []);
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
     *
     * 支持的标准方法：
     * - eth_requestAccounts: 请求连接并返回账户地址列表
     * - eth_accounts: 返回已连接的账户地址列表
     * - eth_chainId: 返回当前链 ID（十六进制）
     * - net_version: 返回当前网络版本（十进制）
     * - eth_sendTransaction: 发送交易（等同于 sendTransaction）
     * - eth_sign / personal_sign: 签名消息
     * - eth_signTypedData / eth_signTypedData_v3 / eth_signTypedData_v4: 签名结构化数据
     * - wallet_watchAsset: 添加自定义代币（EIP-747）
     * - wallet_addEthereumChain: 添加自定义链（EIP-3085）
     * - wallet_switchEthereumChain: 切换链（EIP-3326）
     * - 其他方法: 作为只读 RPC 转发到节点
     */
    request(args: { method: string; params?: any[] }): Promise<any> {
      const { method, params = [] } = args;

      switch (method) {
        case 'eth_requestAccounts':
          return this.connect().then((account: any) => [account?.address]);

        case 'eth_accounts':
          return Promise.resolve(_selectedAddress ? [_selectedAddress] : []);

        case 'eth_chainId':
          return refreshState().then(() => _chainId);

        case 'net_version':
          return refreshState().then(() =>
            _chainId ? parseInt(_chainId, 16).toString() : null
          );

        case 'eth_sendTransaction':
          return this.sendTransaction(params[0]);

        case 'eth_sign':
        case 'personal_sign':
          // personal_sign 参数顺序: [message, address]
          // eth_sign 参数顺序: [address, message]
          const msg = method === 'personal_sign' ? params[0] : params[1];
          return this.signMessage(msg);

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          return sendToBackground(WALLET_SIGN_TYPED_DATA, {
            method,
            params,
          }, SIGN_TIMEOUT);

        case 'wallet_watchAsset':
          return sendToBackground(WALLET_WATCH_ASSET, { params: params[0] });

        case 'wallet_addEthereumChain':
          return sendToBackground(WALLET_ADD_ETHEREUM_CHAIN, { params: params[0] });

        case 'wallet_switchEthereumChain':
          return sendToBackground(WALLET_SWITCH_ETHEREUM_CHAIN, { params: params[0] })
            .then(() => {
              // 切换成功后刷新缓存并触发事件
              const newChainId = params[0]?.chainId;
              if (newChainId) {
                _chainId = newChainId;
                emitEvent('chainChanged', newChainId);
              }
              return null;
            });

        default:
          // 其他方法作为只读 RPC 转发到节点
          return sendToBackground(PROVIDER_RPC_REQUEST, { method, params }, RPC_TIMEOUT);
      }
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
