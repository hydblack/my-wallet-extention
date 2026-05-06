import { useWalletStore } from '../stores/walletStore';
import injectMyWallet from './injected-helper';
import {
  WALLET_CONNECT,
  WALLET_GET_ACCOUNT,
  WALLET_SIGN_MESSAGE,
  WALLET_DISCONNECT,
} from '../utils/constants';

console.log('background 脚本启动了');

// 待处理的连接请求（用于 DApp 连接流程）
let pendingConnection: { requestId: string; tabId?: number; resolve?: (account: unknown) => void; reject?: (error: Error) => void } | null = null;

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
                data: { account: currentAccount }
              }).catch(() => {
                // 忽略发送失败
              });
            }
            pendingConnection.resolve?.(currentAccount);
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
          const account = walletStore.currentAccount
          sendResponse({
            data: { account }
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
      const account = walletStore.currentAccount
      sendResponse({
        data: { account }
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
            data: { account: message.data?.account }
          }).catch(() => {
            // 忽略发送失败
          });
        }
        pendingConnection.resolve?.(message.data?.account);
        pendingConnection = null;
      }
      sendResponse({ success: true });
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