import React, { useState } from "react"
import { useWalletStore } from "../stores/walletStore"

interface UnlockScreenProps {
  onUnlock: () => void
  onBack: () => void
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  onUnlock,
  onBack
}) => {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { unlockWallet } = useWalletStore()

  const handleUnlock = async () => {
    if (!password) {
      setError("请输入密码")
      return
    }

    setIsLoading(true)
    setError("")

    setTimeout(() => {
      unlockWallet(password)
      onUnlock()
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="h-full plasmo-bg-gray-100 dark:plasmo-bg-gray-900 plasmo-p-6">
      {/* 顶部导航 */}
      <div className="plasmo-flex plasmo-items-center plasmo-mb-6">
        <button
          onClick={onBack}
          className="plasmo-p-2 plasmo-text-gray-600 dark:plasmo-text-gray-300 hover:plasmo-bg-gray-200 dark:hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
          <svg
            className="plasmo-w-6 plasmo-h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="plasmo-flex-1 plasmo-text-xl plasmo-font-semibold plasmo-text-gray-900 dark:plasmo-text-white plasmo-text-center plasmo-mr-10">
          解锁钱包
        </h2>
      </div>

      {/* 解锁表单 */}
      <div className="plasmo-max-w-md plasmo-mx-auto plasmo-mt-12">
        {/* 钱包图标 */}
        <div className="plasmo-text-center plasmo-mb-8">
          <div className="plasmo-w-16 plasmo-h-16 plasmo-bg-blue-600 plasmo-rounded-2xl plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4">
            <svg
              className="plasmo-w-8 plasmo-h-8 plasmo-text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-text-gray-900 dark:plasmo-text-white">
            欢迎回来
          </h1>
          <p className="plasmo-text-gray-500 dark:plasmo-text-gray-400 plasmo-mt-2">
            输入密码解锁您的钱包
          </p>
        </div>

        {/* 密码输入框 */}
        <div className="plasmo-space-y-4">
          <div>
            <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 dark:plasmo-text-gray-300 plasmo-mb-2">
              密码
            </label>
            <div className="plasmo-relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-white dark:plasmo-bg-gray-800 plasmo-border plasmo-border-gray-300 dark:plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-900 dark:plasmo-text-white plasmo-placeholder-gray-400 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="plasmo-absolute plasmo-right-3 plasmo-top-1/2 plasmo-transform plasmo--translate-y-1/2 plasmo-text-gray-400 hover:plasmo-text-gray-600">
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="plasmo-p-3 plasmo-bg-red-50 dark:plasmo-bg-red-900/20 plasmo-border plasmo-border-red-200 dark:plasmo-border-red-800 plasmo-rounded-lg">
              <p className="plasmo-text-sm plasmo-text-red-600 dark:plasmo-text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* 解锁按钮 */}
          <button
            onClick={handleUnlock}
            disabled={isLoading}
            className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-blue-600 plasmo-text-white plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-bg-blue-700 plasmo-transition-all plasmo-duration-200 disabled:plasmo-opacity-50 disabled:plasmo-cursor-not-allowed">
            {isLoading ? "解锁中..." : "解锁"}
          </button>
        </div>

        {/* 忘记密码提示 */}
        <p className="plasmo-mt-6 plasmo-text-sm plasmo-text-gray-500 dark:plasmo-text-gray-400 plasmo-text-center">
          忘记密码？您需要使用助记词恢复钱包
        </p>
      </div>
    </div>
  )
}

export default UnlockScreen
