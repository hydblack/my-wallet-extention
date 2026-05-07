import { useWalletStore } from '../stores/walletStore';
import injectMyWallet from './injected-helper';
import { SHA256, AES, enc } from 'crypto-js';
import { ethers } from 'ethers';
import {
  WALLET_CONNECT,
  WALLET_GET_ACCOUNT,
  WALLET_SIGN_MESSAGE,
  WALLET_DISCONNECT,
  WALLET_SEND_TRANSACTION,
  TX_CONFIRMED,
  TX_REJECTED,
  PROVIDER_RPC_REQUEST,
  WALLET_WATCH_ASSET,
  WALLET_ADD_ETHEREUM_CHAIN,
  WALLET_SWITCH_ETHEREUM_CHAIN,
  WALLET_SIGN_TYPED_DATA,
  TX_STORE_KEY,
} from '../utils/constants';

console.log('background 脚本启动了');

// 待处理的连接请求（用于 DApp 连接流程）
let pendingConnection: { requestId: string; tabId?: number; resolve?: (account: unknown) => void; reject?: (error: Error) => void } | null = null;

// 待处理的交易请求（用于 DApp 交易确认流程）
const pendingTxRequests: Map<string, {
  requestId: string;
  tabId?: number;
  tx: any;
  origin?: string;
  resolve?: (hash: string) => void;
  reject?: (error: Error) => void;
}> = new Map();

// 打开 popup 页面的函数
const openPopup = (): Promise<void> => {
  return new Promise((resolve) => {
    // 使用 chrome.action.openPopup 打开 popup
    if (typeof chrome !== 'undefined' && chrome.action?.openPopup) {
      chrome.action.openPopup().then(() => {
        console.log('✅ 已打开 popup');
        resolve();
      }).catch((err) => {
        // popup 可能已经打开，或者 API 不支持，忽略错误
        console.log('ℹ️ 无需打开 popup（可能已打开）:', err.message);
        resolve();
      });
    } else {
      // 不支持 openPopup API，直接 resolve
      console.log('ℹ️ 当前环境不支持 openPopup API');
      resolve();
    }
  });
};

// 安全序列化账户信息（移除私钥等敏感字段）
const safeAccount = (account: any): { address: string; name?: string; index?: number } => {
  if (!account) return account;
  const { address, name, index } = account;
  return { address, name, index };
};

// 将 pending 交易同步到 chrome.storage.local，让 popup 的 transactionStore 能读到
const syncPendingTxToStorage = (requestId: string, tx: any, origin?: string) => {
  chrome.storage.local.get(TX_STORE_KEY, (result) => {
    const existing = result[TX_STORE_KEY];

    // 正确解析现有的 store 状态（兼容字符串和对象两种格式）
    let currentState: { pendingTransactions: any[]; transactionHistory: any[] };
    if (typeof existing === 'string') {
      try {
        const parsed = JSON.parse(existing);
        currentState = parsed?.state || { pendingTransactions: [], transactionHistory: [] };
      } catch {
        currentState = { pendingTransactions: [], transactionHistory: [] };
      }
    } else if (existing && typeof existing === 'object') {
      currentState = (existing as any)?.state || { pendingTransactions: [], transactionHistory: [] };
    } else {
      currentState = { pendingTransactions: [], transactionHistory: [] };
    }

    // 避免重复添加
    if (currentState.pendingTransactions.some((t: any) => t.requestId === requestId)) return;

    const newRecord = {
      requestId,
      method: 'eth_sendTransaction',
      tx: tx || {},
      status: 'pending',
      timestamp: Date.now(),
      origin,
    };

    currentState.pendingTransactions.push(newRecord);

    // 用 zustand persist 兼容的格式（JSON 字符串）写入
    chrome.storage.local.set({
      [TX_STORE_KEY]: JSON.stringify({ state: currentState, version: 0 }),
    });
  });
};

// 从 chrome.storage.local 移除已处理的 pending 交易
const removePendingTxFromStorage = (requestId: string) => {
  chrome.storage.local.get(TX_STORE_KEY, (result) => {
    const existing = result[TX_STORE_KEY];
    if (!existing) return;

    // 正确解析
    let currentState: { pendingTransactions: any[]; transactionHistory: any[] };
    if (typeof existing === 'string') {
      try {
        const parsed = JSON.parse(existing);
        currentState = parsed?.state || { pendingTransactions: [], transactionHistory: [] };
      } catch {
        return;
      }
    } else if (existing && typeof existing === 'object') {
      currentState = (existing as any)?.state || { pendingTransactions: [], transactionHistory: [] };
    } else {
      return;
    }

    currentState.pendingTransactions = currentState.pendingTransactions.filter(
      (t: any) => t.requestId !== requestId
    );

    chrome.storage.local.set({
      [TX_STORE_KEY]: JSON.stringify({ state: currentState, version: 0 }),
    });
  });
};

// 检查钱包是否已初始化（有账户）
const isWalletInitialized = (): boolean => {
  const walletStore = useWalletStore.getState();
  return walletStore.accounts.length > 0;
};

// 检查钱包是否已解锁
const isWalletUnlocked = (): boolean => {
  const walletStore = useWalletStore.getState();
  return !walletStore.isLocked && walletStore.currentAccount !== null;
};

// 监听钱包状态变化（用于 DApp 连接流程）
const setupWalletStateListener = (): void => {
  // 使用 chrome.storage.onChanged 监听钱包状态变化
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes['wallet-store']) {
        const newState = changes['wallet-store'].newValue;
        if (newState && pendingConnection && newState.state) {
          // 检查钱包是否已解锁且有账户
          const { isLocked, currentAccount } = newState.state;
          if (!isLocked && currentAccount) {
            console.log('✅ 钱包已解锁，通知 DApp 连接成功');
            // 通知 message-bridge 连接成功
            if (pendingConnection.tabId !== undefined) {
              chrome.tabs.sendMessage(pendingConnection.tabId, {
                type: 'WALLET_CONNECTION_APPROVED',
                requestId: pendingConnection.requestId,
                data: { account: safeAccount(currentAccount) }
              }).catch(() => {
                // 忽略发送失败
              });
            }
            pendingConnection.resolve?.(safeAccount(currentAccount));
            pendingConnection = null;
          }
        }
      }
    });
  }
};

// 初始化钱包状态
const initWallet = () => {
  const walletStore = useWalletStore.getState()
  // TODO 初始化逻辑
  console.log('🔄 初始化钱包状态完成', walletStore); 
}

// 注册消息监听器
const setupMessageListener = () => {
  console.log('🔄 监听来自 message-bridge 的消息');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("background 收到消息:", message.type, "来自标签页：", sender.tab?.id);
    
      // 获取发送消息的标签页 ID（用于通知 DApp）
    const tabId = sender.tab?.id;
    // 获取 DApp 来源（用于交易确认界面展示）
    const origin = sender.tab?.url || sender.url || undefined;
    
    // 处理连接请求
    if (message.type === WALLET_CONNECT) {
      const requestId = message.requestId;
      
      // 检查钱包状态
      if (!isWalletInitialized()) {
        // 钱包未初始化，需要用户在 popup 中创建/导入钱包
        console.log('🔄 钱包未初始化，打开 popup 页面');
        
        // 打开 popup 并等待用户操作
        openPopup().then(() => {
          // 设置待处理的连接请求
          pendingConnection = { requestId, tabId };
          
          // 设置超时（2分钟）
          setTimeout(() => {
            if (pendingConnection?.requestId === requestId) {
              pendingConnection.reject?.(new Error('连接超时，请重试'));
              pendingConnection = null;
            }
          }, 120_000);
        });
        
        // 返回待处理状态
        sendResponse({
          pending: true,
          message: '请在钱包扩展中完成操作'
        });
        return true;
      }
      
      if (!isWalletUnlocked()) {
        // 钱包已初始化但已锁定，需要用户在 popup 中解锁
        console.log('🔄 钱包已锁定，打开 popup 页面');
        
        openPopup().then(() => {
          pendingConnection = { requestId, tabId };
          
          setTimeout(() => {
            if (pendingConnection?.requestId === requestId) {
              pendingConnection.reject?.(new Error('连接超时，请重试'));
              pendingConnection = null;
            }
          }, 120_000);
        });
        
        sendResponse({
          pending: true,
          message: '请在钱包扩展中完成操作'
        });
        return true;
      }
      
      // 钱包已初始化且已解锁，直接连接
      const walletStore = useWalletStore.getState()
      try {
        walletStore.connect().then(() => {
          sendResponse({
            data: { account: safeAccount(walletStore.currentAccount) }
          })
        }).catch((error) => {
          sendResponse({
            data: { error: error.message },
          })
        })
      } catch (error) {
        sendResponse({
          data: { error: error instanceof Error ? error.message : '连接失败' },
        })
      }
      return true
    }

    // 获取账号请求
    if (message.type === WALLET_GET_ACCOUNT) {
      const walletStore = useWalletStore.getState()
      sendResponse({
        data: { account: safeAccount(walletStore.currentAccount) }
      })
      return true
    }
    
    // 处理签名
    if (message.type === WALLET_SIGN_MESSAGE) {
      if (!message.data || !message.data.message) {
        sendResponse({
          data: { error: '缺少签名信息' },
        })
        return true 
      }
      const walletStore = useWalletStore.getState()
      try {
        walletStore.signMessage(message.data.message)
        .then((signedMessage) => {
          sendResponse({
            data: { signedMessage }
          })
        })
        .catch((error) => {
          sendResponse({
            data: { error: error.message },
          })
        })
      } catch (error) {
        sendResponse({
          data: { error: error instanceof Error ? error.message : '签名失败' },
        })
      }
      return true
    }

    // 处理断开连接
    if (message.type === WALLET_DISCONNECT) {
      const walletStore = useWalletStore.getState()
      walletStore.disconnect()
      sendResponse({
        data: { success: true }
      })
      return true
    }

    // 处理来自 popup 的连接成功通知
    if (message.type === 'DAPP_CONNECTION_SUCCESS') {
      console.log('📥 收到 popup 连接成功通知:', message.data?.account);
      if (pendingConnection) {
        // 通知 message-bridge 连接成功
        if (pendingConnection.tabId !== undefined) {
          chrome.tabs.sendMessage(pendingConnection.tabId, {
            type: 'WALLET_CONNECTION_APPROVED',
            requestId: pendingConnection.requestId,
            data: { account: safeAccount(message.data?.account) }
          }).catch(() => {
            // 忽略发送失败
          });
        }
        pendingConnection.resolve?.(safeAccount(message.data?.account));
        pendingConnection = null;
      }
      sendResponse({ success: true });
      return true;
    }

    // ─── 交易请求处理 ───────────────────────────────────────────────────

    // 处理 DApp 发起的交易请求
    if (message.type === WALLET_SEND_TRANSACTION) {
      const requestId = message.requestId;
      const tx = message.data?.tx;
      const tabId = sender.tab?.id;

      console.log('📥 收到 DApp 交易请求:', requestId, tx);

      // 检查钱包状态
      if (!isWalletInitialized() || !isWalletUnlocked()) {
        console.log('🔄 钱包未解锁，打开 popup');
        openPopup().then(() => {
          // 等待 popup 处理（popup 打开后如果钱包解锁，会自动处理 pending tx）
          // 但用户可能不解锁，设置超时
          setTimeout(() => {
            const pending = pendingTxRequests.get(requestId);
            if (pending) {
              pending.reject?.(new Error('钱包未解锁，交易请求超时'));
              pendingTxRequests.delete(requestId);
              removePendingTxFromStorage(requestId);
              clearBadge();
            }
          }, 300_000);
        });

        // 存入 pending + 同步到 storage（让 popup 能读到）
        pendingTxRequests.set(requestId, { requestId, tabId, tx });
        syncPendingTxToStorage(requestId, tx, origin);
        setBadge();

        sendResponse({ pending: true, message: '请在钱包扩展中确认交易' });
        return true;
      }

      // 钱包已解锁，存入 pending 并弹出 popup
      pendingTxRequests.set(requestId, { requestId, tabId, tx });
      syncPendingTxToStorage(requestId, tx, origin);
      setBadge();

      openPopup().then(() => {
        console.log('✅ 已打开 popup 等待用户确认交易');
      });

      // 设置超时
      setTimeout(() => {
        const pending = pendingTxRequests.get(requestId);
        if (pending) {
          pending.reject?.(new Error('交易请求超时，请重试'));
          pendingTxRequests.delete(requestId);
          removePendingTxFromStorage(requestId);
          clearBadge();
          // 通知 DApp 超时
          if (pending.tabId !== undefined) {
            chrome.tabs.sendMessage(pending.tabId, {
              from: 'message-bridge',
              requestId: pending.requestId,
              type: TX_REJECTED,
              success: false,
              error: '交易请求超时，请重试',
            }).catch(() => {});
          }
        }
      }, 300_000);

      sendResponse({ pending: true, message: '请在钱包扩展中确认交易' });
      return true;
    }

    // 处理来自 popup 的交易确认
    if (message.type === TX_CONFIRMED) {
      const { requestId, hash } = message.data || {};
      console.log('✅ 收到 popup 交易确认:', requestId, hash);

      const pending = pendingTxRequests.get(requestId);
      if (pending) {
        pending.resolve?.(hash);
        pendingTxRequests.delete(requestId);
        removePendingTxFromStorage(requestId);
        clearBadge();

        // 通知 DApp 交易已确认
        if (pending.tabId !== undefined) {
          chrome.tabs.sendMessage(pending.tabId, {
            from: 'message-bridge',
            requestId,
            type: TX_CONFIRMED,
            success: true,
            data: { hash },
          }).catch(() => {});
        }
      }
      sendResponse({ success: true });
      return true;
    }

    // 处理来自 popup 的交易拒绝
    if (message.type === TX_REJECTED) {
      const { requestId, error } = message.data || {};
      console.log('❌ 收到 popup 交易拒绝:', requestId, error);

      const pending = pendingTxRequests.get(requestId);
      if (pending) {
        pending.reject?.(new Error(error || '用户拒绝了交易'));
        pendingTxRequests.delete(requestId);
        removePendingTxFromStorage(requestId);
        clearBadge();

        // 通知 DApp 交易被拒绝
        if (pending.tabId !== undefined) {
          chrome.tabs.sendMessage(pending.tabId, {
            from: 'message-bridge',
            requestId,
            type: TX_REJECTED,
            success: false,
            error: error || '用户拒绝了交易',
          }).catch(() => {});
        }
      }
      sendResponse({ success: true });
      return true;
    }

    // 处理来自 popup 的交易执行请求（popup 确认后，由 background 实际执行链上交易）
    if (message.type === 'TX_EXECUTE') {
      const { requestId, tx, password } = message.data || {};
      console.log('🔄 执行交易:', requestId);

      (async () => {
        try {
          const walletStore = useWalletStore.getState();
          const store = await new Promise<any>((resolve) => {
            chrome.storage.local.get("wallet-store", (result) => {
              const raw = result["wallet-store"];
              if (!raw) { resolve(null); return; }
              // zustand persist 存储的是 JSON 字符串，需先解析
              try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                resolve(parsed?.state || null);
              } catch {
                resolve(null);
              }
            });
          });

          if (!store || !store.currentAccount) {
            sendResponse({ success: false, error: '未找到账户' });
            return;
          }

          // 验证密码
          const hashedPassword = SHA256(password).toString();
          if (store.password !== hashedPassword) {
            sendResponse({ success: false, error: '密码错误' });
            return;
          }

          // 解密私钥：currentAccount.privateKey 是明文，accounts 里是加密的
          // 优先从 accounts 数组中找到加密私钥进行解密（更安全）
          const encryptedAccount = store.accounts?.find(
            (a: any) => a.address === store.currentAccount.address
          );
          let privateKey: string;
          if (encryptedAccount?.privateKey) {
            // accounts 里存的是 AES 加密的私钥，用原始密码解密
            const bytes = AES.decrypt(encryptedAccount.privateKey, password);
            privateKey = bytes.toString(enc.Utf8);
          } else {
            // 兜底：如果 currentAccount.privateKey 不是加密的（明文），直接使用
            privateKey = store.currentAccount.privateKey;
          }

          if (!privateKey || privateKey.length === 0) {
            sendResponse({ success: false, error: '私钥解密失败' });
            return;
          }

          const provider = new ethers.JsonRpcProvider(store.currentNetwork.rpcUrl);
          const wallet = new ethers.Wallet(privateKey, provider);

          // 构造交易参数（显式指定所有字段，避免 ethers 重新估算覆盖）
          const txParams: any = {
            from: store.currentAccount.address,
            type: 2, // EIP-1559
          };
          if (tx.to) txParams.to = tx.to;
          if (tx.value && tx.value !== '0x0' && tx.value !== '0x') txParams.value = tx.value;
          if (tx.data && tx.data !== '0x') txParams.data = tx.data;

          // Gas 限制：优先用 DApp 传入的，否则自动估算
          let gasLimit: bigint;
          if (tx.gasLimit) {
            gasLimit = typeof tx.gasLimit === 'string'
              ? BigInt(tx.gasLimit.startsWith('0x') ? tx.gasLimit : '0x' + BigInt(tx.gasLimit).toString(16))
              : BigInt(tx.gasLimit);
          } else {
            try {
              const estimated = await provider.estimateGas({
                from: store.currentAccount.address,
                to: tx.to,
                value: txParams.value,
                data: txParams.data,
              });
              gasLimit = (estimated * 130n) / 100n;
              console.log('✅ Gas 估算成功:', estimated.toString(), '→ 使用:', gasLimit.toString());
            } catch (e: any) {
              // 根据是否有合约调用判断兜底值
              gasLimit = (tx.data && tx.data !== '0x') ? 500000n : 21000n;
              console.warn('⚠️ Gas 估算失败，使用兜底值:', gasLimit.toString(), e.message);
            }
          }
          txParams.gasLimit = Number(gasLimit); // ethers 期望 number

          // EIP-1559 fee 数据
          const feeData = await provider.getFeeData();
          txParams.maxFeePerGas = tx.maxFeePerGas
            ? Number(BigInt(tx.maxFeePerGas))
            : (feeData.maxFeePerGas ? Number(feeData.maxFeePerGas) : undefined);
          txParams.maxPriorityFeePerGas = tx.maxPriorityFeePerGas
            ? Number(BigInt(tx.maxPriorityFeePerGas))
            : (feeData.maxPriorityFeePerGas ? Number(feeData.maxPriorityFeePerGas) : undefined);
          if (!txParams.maxFeePerGas) {
            txParams.gasPrice = tx.gasPrice
              ? Number(BigInt(tx.gasPrice))
              : (feeData.gasPrice ? Number(feeData.gasPrice) : undefined);
          }

          console.log('📤 发送交易参数:', JSON.stringify({
            to: txParams.to,
            value: txParams.value,
            gasLimit: txParams.gasLimit,
            data: txParams.data?.slice(0, 20) + '...',
          }));

          // 发送交易（ethers 会 populate + sign + send）
          const sentTx = await wallet.sendTransaction(txParams);
          console.log('✅ 交易已发送:', sentTx.hash);

          sendResponse({ success: true, data: { hash: sentTx.hash } });
        } catch (error: any) {
          console.error('❌ 交易执行失败:', error);
          sendResponse({ success: false, error: error?.message || '交易执行失败' });
        }
      })();

      return true;
    }

    // ─── EIP-1193 Provider RPC 处理 ───────────────────────────────────────

    // 处理来自 DApp 的只读 RPC 调用（eth_chainId, eth_getBalance, eth_call 等）
    if (message.type === PROVIDER_RPC_REQUEST) {
      const { method, params } = message.data || {};

      (async () => {
        try {
          const walletStore = useWalletStore.getState();
          const rpcUrl = walletStore.currentNetwork?.rpcUrl;
          if (!rpcUrl) {
            sendResponse({ success: false, error: '未配置 RPC 节点' });
            return;
          }

          // 直接使用 fetch 调用 RPC 节点
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method,
              params: params || [],
            }),
          });

          const json = await response.json();
          if (json.error) {
            sendResponse({
              success: false,
              error: json.error.message || 'RPC error',
              code: json.error.code,
            });
          } else {
            sendResponse({ success: true, data: json.result });
          }
        } catch (error: any) {
          console.error('❌ RPC 请求失败:', method, error);
          sendResponse({
            success: false,
            error: error?.message || 'RPC request failed',
          });
        }
      })();

      return true;
    }

    // ─── DApp Provider 消息处理（EIP-747 / EIP-3085 / EIP-3326 / 签名）───

    // 处理 wallet_watchAsset（EIP-747 添加自定义代币）
    if (message.type === WALLET_WATCH_ASSET) {
      const watchParams = message.data?.params;
      if (!watchParams) {
        sendResponse({ success: false, error: '缺少 watchAsset 参数' });
        return true;
      }

      const { type, options } = watchParams;
      if (!['ERC20', 'ERC721', 'ERC1155'].includes(type)) {
        sendResponse({ success: false, error: `Unsupported asset type: ${type}` });
        return true;
      }

      try {
        const walletStore = useWalletStore.getState();
        const token = {
          address: options.address,
          symbol: options.symbol,
          name: options.symbol, // 简化处理
          decimals: options.decimals || 18,
          type: type as 'ERC20' | 'ERC721' | 'ERC1155',
          image: options.image,
        };
        walletStore.addToken(token);
        sendResponse({ success: true, data: true });
      } catch (error: any) {
        sendResponse({ success: false, error: error?.message || 'watchAsset failed' });
      }
      return true;
    }

    // 处理 wallet_addEthereumChain（EIP-3085 添加自定义链）
    if (message.type === WALLET_ADD_ETHEREUM_CHAIN) {
      const chainParams = message.data?.params;
      if (!chainParams) {
        sendResponse({ success: false, error: '缺少 addEthereumChain 参数' });
        return true;
      }

      try {
        const walletStore = useWalletStore.getState();
        const network = {
          id: chainParams.chainName.toLowerCase().replace(/\s+/g, '-'),
          name: chainParams.chainName,
          rpcUrl: chainParams.rpcUrls?.[0],
          chainId: parseInt(chainParams.chainId, 16),
          symbol: chainParams.nativeCurrency?.symbol,
          blockExplorerUrl: chainParams.blockExplorerUrls?.[0],
        };
        walletStore.addNetwork(network);
        sendResponse({ success: true, data: null });
      } catch (error: any) {
        sendResponse({ success: false, error: error?.message || 'addEthereumChain failed' });
      }
      return true;
    }

    // 处理 wallet_switchEthereumChain（EIP-3326 切换链）
    if (message.type === WALLET_SWITCH_ETHEREUM_CHAIN) {
      const switchParams = message.data?.params;
      if (!switchParams) {
        sendResponse({ success: false, error: '缺少 switchEthereumChain 参数' });
        return true;
      }

      try {
        const walletStore = useWalletStore.getState();
        const chainId = parseInt(switchParams.chainId, 16);
        const network = walletStore.networks.find(net => net.chainId === chainId);

        if (!network) {
          sendResponse({ success: false, error: `Chain not found: ${switchParams.chainId}`, code: 4902 });
          return true;
        }

        walletStore.switchNetwork(network.id);
        sendResponse({ success: true, data: null });
      } catch (error: any) {
        sendResponse({ success: false, error: error?.message || 'switchEthereumChain failed' });
      }
      return true;
    }

    // 处理 eth_signTypedData / eth_signTypedData_v4（签名结构化数据）
    if (message.type === WALLET_SIGN_TYPED_DATA) {
      const { method, params } = message.data || {};
      if (!params || params.length === 0) {
        sendResponse({ success: false, error: '缺少签名参数' });
        return true;
      }

      // TODO: 实现结构化数据签名，需弹出确认界面
      // 目前返回未实现错误
      sendResponse({ success: false, error: 'Typed data signing not implemented yet' });
      return true;
    }

    // 未知类型消息
    sendResponse({
      data: { error: '未知消息类型' },
    })
    return true
  })
}

// 注入钱包脚本到页面
const setupScriptInjection = () => {
  // 当页面加载完成时注入
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
      console.log("🔄 页面加载完成，开始注入 myWallet:", tab.url)
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: injectMyWallet
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("❌ Background script: 注入失败", chrome.runtime.lastError)
        } else {
          console.log("✅ Background script: myWallet 注入完成")
        }
      })
    }
  })

  // 当标签页激活时也注入（备用机制）
  chrome.tabs.onActivated.addListener((e) => {
    chrome.tabs.get(e.tabId, (tab) => {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        console.log("🔄 标签页激活，注入 myWallet:", tab.url)
        chrome.scripting.executeScript({
          target: { tabId: e.tabId },
          world: "MAIN",
          func: injectMyWallet
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("❌ Background script: 注入失败", chrome.runtime.lastError)
          } else {
            console.log("✅ Background script: myWallet 注入完成")
          }
        })  
      }
    })  
  })
}

// Badge 工具函数
const setBadge = () => {
  if (typeof chrome !== 'undefined' && chrome.action) {
    const count = pendingTxRequests.size;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#c8f560' });
    }
  }
};

const clearBadge = () => {
  if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.setBadgeText({ text: '' });
  }
};

// 初始化
initWallet()
setupMessageListener()
setupScriptInjection()
setupWalletStateListener()

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔄 扩展安装事件:', details.reason);
  if (details.reason === 'install') {
    // 执行安装时的操作
    console.log('🔄 扩展安装完成');
  }
})