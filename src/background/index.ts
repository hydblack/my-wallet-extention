import { useWalletStore } from '../stores/walletStore';
import injectMyWallet from './injected-helper';
import {
  WALLET_CONNECT,
  WALLET_GET_ACCOUNT,
  WALLET_SIGN_MESSAGE,
  WALLET_DISCONNECT,
  WALLET_SEND_TRANSACTION,
  TX_CONFIRMED,
  TX_REJECTED,
  PROVIDER_RPC_REQUEST,
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
    // 使用 chrome.action.openPopup 或创建新标签
    if (typeof chrome !== 'undefined' && chrome.action?.openPopup) {
      chrome.action.openPopup().then(() => {
        console.log('✅ 已打开 popup');
        resolve();
      }).catch(() => {
        // openPopup 失败时使用备用方案
        fallbackOpenPopup(resolve);
      });
    } else {
      fallbackOpenPopup(resolve);
    }
  });
};

// 备用方案：创建新标签打开 popup
const fallbackOpenPopup = (resolve: () => void): void => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') }).then(() => {
      console.log('✅ 已通过新标签打开 popup');
      resolve();
    }).catch(() => {
      console.error('❌ 打开 popup 失败');
      resolve();
    });
  } else {
    resolve();
  }
};

// 安全序列化账户信息（移除私钥等敏感字段）
const safeAccount = (account: any): { address: string; name?: string; index?: number } => {
  if (!account) return account;
  const { address, name, index } = account;
  return { address, name, index };
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
              clearBadge();
            }
          }, 300_000);
        });

        // 存入 pending
        pendingTxRequests.set(requestId, { requestId, tabId, tx });
        setBadge();

        sendResponse({ pending: true, message: '请在钱包扩展中确认交易' });
        return true;
      }

      // 钱包已解锁，存入 pending 并弹出 popup
      pendingTxRequests.set(requestId, { requestId, tabId, tx });
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
              resolve(result["wallet-store"]?.state || null);
            });
          });

          if (!store || !store.currentAccount) {
            sendResponse({ success: false, error: '未找到账户' });
            return;
          }

          // 验证密码
          const { SHA256 } = await import('crypto-js');
          const hashedPassword = SHA256(password).toString();
          if (store.password !== hashedPassword) {
            sendResponse({ success: false, error: '密码错误' });
            return;
          }

          // 解密私钥
          const { AES, enc } = await import('crypto-js');
          const bytes = AES.decrypt(store.currentAccount.privateKey, store.password);
          const privateKey = bytes.toString(enc.Utf8);

          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider(store.currentNetwork.rpcUrl);
          const wallet = new ethers.Wallet(privateKey, provider);

          // 构造交易参数
          const txParams: any = {};
          if (tx.to) txParams.to = tx.to;
          if (tx.value) txParams.value = tx.value;
          if (tx.data) txParams.data = tx.data;
          if (tx.gasLimit) txParams.gasLimit = tx.gasLimit;

          // 自动估算 gas（如果未提供）
          if (!txParams.gasLimit) {
            try {
              const estimated = await provider.estimateGas(txParams);
              txParams.gasLimit = (estimated * 120n) / 100n;
            } catch {
              txParams.gasLimit = 21000n;
            }
          }

          // EIP-1559 或 Legacy
          const feeData = await provider.getFeeData();
          if (feeData.maxFeePerGas) {
            txParams.maxFeePerGas = tx.maxFeePerGas || feeData.maxFeePerGas;
            txParams.maxPriorityFeePerGas = tx.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas;
          } else {
            txParams.gasPrice = tx.gasPrice || feeData.gasPrice;
          }

          // 发送交易
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