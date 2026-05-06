import React, { useState, useEffect } from 'react';
import { LockScreen } from './components/LockScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { MainDashboard } from './components/MainDashboard';
import { ExportModal } from './components/ExportModal';
import { useWalletStore } from './stores/walletStore';

type View = 'lock' | 'unlock' | 'create' | 'import' | 'dashboard';

// DApp 连接请求通知组件
const DAppConnectionNotifier: React.FC<{ isConnected: boolean; currentAccount: unknown }> = ({ isConnected, currentAccount }) => {
  useEffect(() => {
    if (isConnected && currentAccount) {
      // 通知 background DApp 连接成功
      console.log('📤 通知 DApp 连接成功:', currentAccount);
      chrome.runtime.sendMessage({
        type: 'DAPP_CONNECTION_SUCCESS',
        data: { account: currentAccount }
      }).catch(() => {
        // 忽略发送失败（可能 background 已经通过 storage 监听到了）
      });
    }
  }, [isConnected, currentAccount]);

  return null;
};

function WalletApp() {
  const [currentView, setCurrentView] = useState<View>('lock');
  const [exportType, setExportType] = useState<'mnemonic' | 'privateKey' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 从 store 读取钱包状态
  const { accounts, isLocked, lockWallet, isConnected, currentAccount } = useWalletStore();
  const hasWallet = accounts.length > 0;

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

  // 未初始化时不渲染内容，避免闪烁
  if (!isInitialized) {
    return (
      <div className="plasmo-w-[360px] plasmo-min-h-[500px] plasmo-bg-[#2d3142]" />
    );
  }

  return (
    <div className="plasmo-w-[360px] plasmo-min-h-[500px] plasmo-bg-[#2d3142]">
      {/* DApp 连接通知器 */}
      <DAppConnectionNotifier isConnected={isConnected} currentAccount={currentAccount} />

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
    </div>
  );
}

export default WalletApp;
