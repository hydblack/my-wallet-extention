import React, { useState } from 'react';
import { LockScreen } from './components/LockScreen';
import { UnlockScreen } from './components/UnlockScreen';
import { CreateWallet } from './components/CreateWallet';
import { ImportWallet } from './components/ImportWallet';
import { MainDashboard } from './components/MainDashboard';
import { ExportModal } from './components/ExportModal';

type View = 'lock' | 'unlock' | 'create' | 'import' | 'dashboard';

function WalletApp() {
  const [currentView, setCurrentView] = useState<View>('lock');
  const [hasWallet, setHasWallet] = useState(false);
  const [exportType, setExportType] = useState<'mnemonic' | 'privateKey' | null>(null);

  const handleLock = () => {
    setCurrentView('lock');
  };

  const handleUnlock = () => {
    setCurrentView('dashboard');
  };

  const handleWalletCreated = () => {
    setHasWallet(true);
    setCurrentView('dashboard');
  };

  const handleOpenExport = (type: 'mnemonic' | 'privateKey') => {
    setExportType(type);
  };

  const handleCloseExport = () => {
    setExportType(null);
  };

  return (
    <div className="plasmo-w-[360px] plasmo-min-h-[500px] plasmo-bg-gray-100 dark:plasmo-bg-gray-900">
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
