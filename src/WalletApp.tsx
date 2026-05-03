import React, { useState, useEffect } from 'react';
import { LockScreen } from './components/LockScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { MainDashboard } from './components/MainDashboard';
import { ExportModal } from './components/ExportModal';
import { useWalletStore } from './stores/walletStore';

type View = 'lock' | 'unlock' | 'create' | 'import' | 'dashboard';

function WalletApp() {
  const [currentView, setCurrentView] = useState<View>('lock');
  const [exportType, setExportType] = useState<'mnemonic' | 'privateKey' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 从 store 读取钱包状态
  const { accounts, isLocked, lockWallet } = useWalletStore();
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
