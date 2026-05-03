import React from "react"

import icon from "~/assets/icon.png"

interface LockScreenProps {
  onUnlock: () => void
  onImport: () => void
  onCreate: () => void
  hasWallet: boolean
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  onImport,
  onCreate,
  hasWallet
}) => {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-between plasmo-min-h-[500px] plasmo-bg-[#2d3142] plasmo-p-6">
      {/* 顶部留白区域，保持视觉平衡 */}
      <div className="plasmo-flex-1" />

      {/* Logo 区域 */}
      <div className="plasmo-text-center">
        <div className="plasmo-w-24 plasmo-h-24 plasmo-mx-auto plasmo-mb-6 plasmo-rounded-3xl plasmo-overflow-hidden plasmo-shadow-2xl">
          <img
            src={icon}
            alt="Logo"
            className="plasmo-w-full plasmo-h-full plasmo-object-cover"
          />
        </div>
        <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-text-[#c8f560]">
          MetaNodeWallet
        </h1>
        <p className="plasmo-mt-2 plasmo-text-sm plasmo-text-gray-400">
          安全、简单的 Web3 钱包
        </p>
      </div>

      {/* 按钮组 */}
      <div className="plasmo-w-full plasmo-max-w-xs plasmo-space-y-3 plasmo-mt-8">
        {hasWallet && (
          <button
            onClick={onUnlock}
            className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-lg hover:plasmo-brightness-110 plasmo-transition-all plasmo-duration-200">
            解锁钱包
          </button>
        )}

        {!hasWallet && (
          <>
            <button
              onClick={onCreate}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#3d4252] plasmo-text-[#c8f560] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-bg-[#4d5262] plasmo-transition-all plasmo-duration-200">
              创建新钱包
            </button>
            <button
              onClick={onImport}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-transparent plasmo-text-gray-300 plasmo-font-semibold plasmo-rounded-xl plasmo-border-2 plasmo-border-gray-600 hover:plasmo-border-[#c8f560] hover:plasmo-text-[#c8f560] plasmo-transition-all plasmo-duration-200">
              导入钱包
            </button>
          </>
        )}
      </div>

      {/* 底部提示 */}
      <div className="plasmo-mt-6 plasmo-mb-2">
        <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-text-center">
          您的密钥经过加密存储
          <br />
          只有您可以访问
        </p>
      </div>
    </div>
  )
}

export default LockScreen
