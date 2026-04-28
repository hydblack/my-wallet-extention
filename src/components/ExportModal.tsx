import React, { useState } from 'react';

interface ExportModalProps {
  type: 'mnemonic' | 'privateKey';
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ type, onClose }) => {
  const [step, setStep] = useState<'warning' | 'password' | 'export'>('warning');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportData, setExportData] = useState('');
  const [copied, setCopied] = useState(false);

  const isMnemonic = type === 'mnemonic';

  const handleVerifyPassword = async () => {
    if (!password) {
      setError('请输入密码');
      return;
    }
    setIsLoading(true);
    setError('');

    // TODO: 调用你的解密和导出逻辑
    // try {
    //   const data = await decryptAndExport(password, type);
    //   setExportData(data);
    //   setStep('export');
    // } catch (err) {
    //   setError('密码错误');
    // }

    setTimeout(() => {
      if (isMnemonic) {
        setExportData('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      } else {
        setExportData('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      }
      setStep('export');
      setIsLoading(false);
    }, 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'warning') {
    return (
      <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/50 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
        <div className="plasmo-bg-white dark:plasmo-bg-gray-800 plasmo-rounded-2xl plasmo-w-full plasmo-max-w-md plasmo-overflow-hidden">
          <div className="plasmo-p-6">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-6">
              <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 dark:plasmo-text-white">
                导出{isMnemonic ? '助记词' : '私钥'}
              </h3>
              <button
                onClick={onClose}
                className="plasmo-p-2 plasmo-text-gray-500 hover:plasmo-bg-gray-100 dark:hover:plasmo-bg-gray-700 plasmo-rounded-lg"
              >
                <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 警告图标 */}
            <div className="plasmo-text-center plasmo-mb-6">
              <div className="plasmo-w-16 plasmo-h-16 plasmo-bg-red-100 dark:plasmo-bg-red-900/30 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4">
                <svg className="plasmo-w-8 plasmo-h-8 plasmo-text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 dark:plasmo-text-white plasmo-mb-2">
                保护好您的{isMnemonic ? '助记词' : '私钥'}
              </h4>
              <p className="plasmo-text-sm plasmo-text-gray-600 dark:plasmo-text-gray-400">
                {isMnemonic ? '任何人只要持有您的助记词即可控制您的钱包资产。请务必在安全的环境下查看和备份。' : '私钥是您钱包的钥匙。任何人获得私钥即可完全控制您的资产。请勿透露给任何人。'}
              </p>
            </div>

            {/* 警告列表 */}
            <div className="plasmo-space-y-3 plasmo-mb-6">
              <div className="plasmo-flex plasmo-items-start plasmo-space-x-3 plasmo-p-3 plasmo-bg-red-50 dark:plasmo-bg-red-900/20 plasmo-rounded-lg">
                <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-red-600 plasmo-mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="plasmo-text-sm plasmo-text-gray-700 dark:plasmo-text-gray-300">
                  不要分享给任何人，包括自称是官方客服的人
                </p>
              </div>
              <div className="plasmo-flex plasmo-items-start plasmo-space-x-3 plasmo-p-3 plasmo-bg-red-50 dark:plasmo-bg-red-900/20 plasmo-rounded-lg">
                <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-red-600 plasmo-mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="plasmo-text-sm plasmo-text-gray-700 dark:plasmo-text-gray-300">
                  不要存储在电脑或手机上
                </p>
              </div>
              <div className="plasmo-flex plasmo-items-start plasmo-space-x-3 plasmo-p-3 plasmo-bg-green-50 dark:plasmo-bg-green-900/20 plasmo-rounded-lg">
                <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-green-600 plasmo-mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="plasmo-text-sm plasmo-text-gray-700 dark:plasmo-text-gray-300">
                  推荐使用纸质备份，安全存储在物理保险箱
                </p>
              </div>
            </div>
          </div>

          <div className="plasmo-px-6 plasmo-pb-6">
            <button
              onClick={() => setStep('password')}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-blue-600 plasmo-text-white plasmo-font-semibold plasmo-rounded-xl hover:plasmo-bg-blue-700 plasmo-transition-colors"
            >
              继续
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/50 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
        <div className="plasmo-bg-white dark:plasmo-bg-gray-800 plasmo-rounded-2xl plasmo-w-full plasmo-max-w-md plasmo-overflow-hidden">
          <div className="plasmo-p-6">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-6">
              <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 dark:plasmo-text-white">
                输入密码
              </h3>
              <button
                onClick={onClose}
                className="plasmo-p-2 plasmo-text-gray-500 hover:plasmo-bg-gray-100 dark:hover:plasmo-bg-gray-700 plasmo-rounded-lg"
              >
                <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="plasmo-text-sm plasmo-text-gray-600 dark:plasmo-text-gray-400 plasmo-mb-4">
              请输入您的钱包密码以继续导出{isMnemonic ? '助记词' : '私钥'}。
            </p>

            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 dark:plasmo-text-gray-300 plasmo-mb-2">
                密码
              </label>
              <div className="plasmo-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-white dark:plasmo-bg-gray-900 plasmo-border plasmo-border-gray-300 dark:plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-900 dark:plasmo-text-white plasmo-placeholder-gray-400 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="plasmo-absolute plasmo-right-3 plasmo-top-1/2 plasmo-transform plasmo--translate-y-1/2 plasmo-text-gray-400 hover:plasmo-text-gray-600"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="plasmo-mt-4 plasmo-p-3 plasmo-bg-red-50 dark:plasmo-bg-red-900/20 plasmo-border plasmo-border-red-200 dark:plasmo-border-red-800 plasmo-rounded-lg">
                <p className="plasmo-text-sm plasmo-text-red-600 dark:plasmo-text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="plasmo-px-6 plasmo-pb-6 plasmo-flex plasmo-space-x-3">
            <button
              onClick={() => setStep('warning')}
              className="plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-bg-gray-100 dark:plasmo-bg-gray-700 plasmo-text-gray-900 dark:plasmo-text-white plasmo-font-semibold plasmo-rounded-xl hover:plasmo-bg-gray-200 dark:hover:plasmo-bg-gray-600 plasmo-transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleVerifyPassword}
              disabled={isLoading}
              className="plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-bg-blue-600 plasmo-text-white plasmo-font-semibold plasmo-rounded-xl hover:plasmo-bg-blue-700 plasmo-transition-colors disabled:plasmo-opacity-50"
            >
              {isLoading ? '验证中...' : '确认'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/50 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
      <div className="plasmo-bg-white dark:plasmo-bg-gray-800 plasmo-rounded-2xl plasmo-w-full plasmo-max-w-md plasmo-overflow-hidden">
        <div className="plasmo-p-6">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-6">
            <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 dark:plasmo-text-white">
              {isMnemonic ? '助记词' : '私钥'}
            </h3>
            <button
              onClick={onClose}
              className="plasmo-p-2 plasmo-text-gray-500 hover:plasmo-bg-gray-100 dark:hover:plasmo-bg-gray-700 plasmo-rounded-lg"
            >
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="plasmo-mb-4">
            <div className="plasmo-p-4 plasmo-bg-yellow-50 dark:plasmo-bg-yellow-900/20 plasmo-border plasmo-border-yellow-200 dark:plasmo-border-yellow-800 plasmo-rounded-xl">
              <div className="plasmo-flex plasmo-items-start plasmo-space-x-2">
                <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-yellow-600 plasmo-mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="plasmo-text-sm plasmo-text-yellow-800 dark:plasmo-text-yellow-200">
                  请立即备份您的{isMnemonic ? '助记词' : '私钥'}。关闭此页面后，您将无法再通过此界面查看。
                </p>
              </div>
            </div>
          </div>

          {/* 导出内容显示 */}
          <div className="plasmo-p-4 plasmo-bg-gray-100 dark:plasmo-bg-gray-900 plasmo-rounded-xl plasmo-border plasmo-border-gray-300 dark:plasmo-border-gray-600">
            {isMnemonic ? (
              <div className="plasmo-grid plasmo-grid-cols-3 plasmo-gap-2">
                {exportData.split(' ').map((word, index) => (
                  <div key={index} className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-p-2 plasmo-bg-white dark:plasmo-bg-gray-800 plasmo-rounded-lg">
                    <span className="plasmo-text-xs plasmo-text-gray-400 plasmo-w-5">{index + 1}.</span>
                    <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900 dark:plasmo-text-white">{word}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="plasmo-break-all">
                <code className="plasmo-text-sm plasmo-font-mono plasmo-text-gray-900 dark:plasmo-text-white">{exportData}</code>
              </div>
            )}
          </div>
        </div>

        <div className="plasmo-px-6 plasmo-pb-6 plasmo-space-y-3">
          <button
            onClick={handleCopy}
            className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-blue-600 plasmo-text-white plasmo-font-semibold plasmo-rounded-xl hover:plasmo-bg-blue-700 plasmo-transition-colors"
          >
            {copied ? '已复制到剪贴板！' : '复制到剪贴板'}
          </button>
          <button
            onClick={onClose}
            className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-text-gray-600 dark:plasmo-text-gray-400 plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-gray-100 dark:hover:plasmo-bg-gray-700 plasmo-transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
