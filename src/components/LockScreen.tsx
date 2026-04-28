import React from 'react';

interface LockScreenProps {
  onUnlock: () => void;
  onImport: () => void;
  onCreate: () => void;
  hasWallet: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  onImport,
  onCreate,
  hasWallet,
}) => {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center h-full plasmo-bg-gradient-to-br plasmo-from-blue-600 plasmo-to-blue-800 plasmo-p-6">
      {/* Logo */}
      <div className="plasmo-mb-8 plasmo-text-center">
        <div className="plasmo-w-20 plasmo-h-20 plasmo-bg-white plasmo-rounded-3xl plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4 plasmo-shadow-lg">
          <span className="plasmo-text-3xl plasmo-font-bold plasmo-text-blue-600">MN</span>
        </div>
        <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-text-white">MetaNodeWallet</h1>
      </div>

      {/* 按钮组 */}
      <div className="plasmo-w-full plasmo-max-w-xs plasmo-space-y-3">
        {hasWallet && (
          <button
            onClick={onUnlock}
            className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-white plasmo-text-blue-600 plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-shadow-lg plasmo-transition-all plasmo-duration-200"
          >
            解锁钱包
          </button>
        )}

        <button
          onClick={onCreate}
          className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-blue-500 plasmo-text-white plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-bg-blue-600 plasmo-transition-all plasmo-duration-200"
        >
          创建新钱包
        </button>

        <button
          onClick={onImport}
          className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-transparent plasmo-text-white plasmo-font-semibold plasmo-rounded-xl plasmo-border-2 plasmo-border-white plasmo-border-opacity-50 hover:plasmo-bg-white hover:plasmo-bg-opacity-10 plasmo-transition-all plasmo-duration-200"
        >
          导入钱包
        </button>
      </div>

      {/* 底部提示 */}
      <p className="plasmo-mt-8 plasmo-text-sm plasmo-text-blue-200 plasmo-text-center">
        您的密钥经过加密存储<br />
        只有您可以访问
      </p>
    </div>
  );
};

export default LockScreen;
