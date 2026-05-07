import React, { useState, useEffect } from 'react';
import { LockScreen } from './components/LockScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { MainDashboard } from './components/MainDashboard';
import { ExportModal } from './components/ExportModal';
import { TransactionConfirmation } from './components/TransactionConfirmation';
import { useWalletStore } from './stores/walletStore';
import { useTransactionStore } from './stores/transactionStore';
import { TX_STORE_KEY, TX_CONFIRMED, TX_REJECTED } from './utils/constants';

type View = 'lock' | 'unlock' | 'create' | 'import' | 'dashboard';

// DApp 连接请求通知组件
const DAppConnectionNotifier: React.FC<{ currentAccount: unknown }> = ({ currentAccount }) => {
  useEffect(() => {
    if (currentAccount) {
      // 通知 background DApp 连接成功
      console.log('📤 通知 DApp 连接成功:', currentAccount);
      chrome.runtime.sendMessage({
        type: 'DAPP_CONNECTION_SUCCESS',
        data: { account: currentAccount }
      }).catch(() => {
        // 忽略发送失败（可能 background 已经通过 storage 监听到了）
      });
    }
  }, [currentAccount]);

  return null;
};

function WalletApp() {
  const [currentView, setCurrentView] = useState<View>('lock');
  const [exportType, setExportType] = useState<'mnemonic' | 'privateKey' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 从 store 读取钱包状态
  const { accounts, isLocked, lockWallet, currentAccount } = useWalletStore();
  const hasWallet = accounts.length > 0;

  // 交易确认相关状态
  const {
    pendingTransactions,
    confirmTx,
    rejectTx,
  } = useTransactionStore();
  const currentPendingTx = pendingTransactions[0];

  // 初始化时根据钱包状态决定显示哪个页面
  useEffect(() => {
    if (!isInitialized) {
      if (hasWallet) {
        // 有钱包但未锁定，直接进入 dashboard
        if (!isLocked) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('lock');
        }
      } else {
        setCurrentView('lock');
      }
      setIsInitialized(true);

      // 主动从 chrome.storage.local 同步 pending 交易
      // 解决 background 在 popup 打开前就写入数据、onChanged 不会触发的问题
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(TX_STORE_KEY, (result) => {
          const raw = result[TX_STORE_KEY];
          if (raw) {
            const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
            useTransactionStore.getState()._syncFromStorage(rawStr);
          }
        });
      }
    }
  }, [hasWallet, isLocked, isInitialized]);

  // 当从 lock/unlock/create/import 切换到 dashboard 时，通知 background
  useEffect(() => {
    if (currentView === 'dashboard' && currentAccount) {
      // 通知 background DApp 连接成功
      console.log('📤 钱包已就绪，通知 DApp:', currentAccount);
      chrome.runtime.sendMessage({
        type: 'DAPP_CONNECTION_SUCCESS',
        data: { account: currentAccount }
      }).catch((err) => {
        console.log('通知 background 失败（正常如果没有待处理请求）:', err.message);
      });
    }
  }, [currentView, currentAccount]);

  const handleLock = () => {
    lockWallet();
    setCurrentView('lock');
  };

  const handleUnlock = () => {
    setCurrentView('dashboard');
  };

  const handleWalletCreated = () => {
    setCurrentView('dashboard');
  };

  const handleOpenExport = (type: 'mnemonic' | 'privateKey') => {
    setExportType(type);
  };

  const handleCloseExport = () => {
    setExportType(null);
  };

  // 交易确认处理
  const handleTxConfirm = (requestId: string, hash: string) => {
    confirmTx(requestId, hash);
    // 通知 background 交易已确认
    chrome.runtime.sendMessage({
      type: TX_CONFIRMED,
      data: { requestId, hash },
    }).catch(() => {});
  };

  const handleTxReject = (requestId: string, error: string) => {
    rejectTx(requestId);
    // 通知 background 交易已拒绝
    chrome.runtime.sendMessage({
      type: TX_REJECTED,
      data: { requestId, error },
    }).catch(() => {});
  };

  // 未初始化时不渲染内容，避免闪烁
  if (!isInitialized) {
    return (
      <div className="plasmo-w-[360px] plasmo-min-h-[500px] plasmo-bg-[#2d3142]" />
    );
  }

  return (
    <div className="plasmo-w-[360px] plasmo-min-h-[500px] plasmo-bg-[#2d3142]">
      {/* DApp 连接通知器 */}
      <DAppConnectionNotifier currentAccount={currentAccount} />

      {/* 交易确认界面（优先显示，覆盖其他内容） */}
      {currentPendingTx && currentView === 'dashboard' && (
        <TransactionConfirmation
          tx={currentPendingTx.tx}
          origin={currentPendingTx.origin}
          requestId={currentPendingTx.requestId}
          onConfirm={handleTxConfirm}
          onReject={handleTxReject}
        />
      )}

      {/* 正常 UI（无 pending 交易时显示） */}
      {!(currentPendingTx && currentView === 'dashboard') && (
        <>
          {currentView === 'lock' && (
            <LockScreen
              onUnlock={() => setCurrentView('unlock')}
              onImport={() => setCurrentView('import')}
              onCreate={() => setCurrentView('create')}
              hasWallet={hasWallet}
            />
          )}

          {currentView === 'unlock' && (
            <UnlockScreen
              onUnlock={handleUnlock}
              onBack={() => setCurrentView('lock')}
              onImport={() => setCurrentView('import')}
            />
          )}

          {currentView === 'create' && (
            <CreateWallet
              onCreated={handleWalletCreated}
              onBack={() => setCurrentView('lock')}
            />
          )}

          {currentView === 'import' && (
            <ImportWallet
              onImported={handleWalletCreated}
              onBack={() => setCurrentView('lock')}
            />
          )}

          {currentView === 'dashboard' && (
            <MainDashboard
              onLock={handleLock}
              onExport={handleOpenExport}
            />
          )}

          {exportType && (
            <ExportModal
              type={exportType}
              onClose={handleCloseExport}
            />
          )}
        </>
      )}
    </div>
  );
}

export default WalletApp;
