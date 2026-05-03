import React, { useState } from "react"
import { useWalletStore } from "../stores/walletStore"

interface CreateWalletProps {
  onCreated: () => void
  onBack: () => void
}

export const CreateWallet: React.FC<CreateWalletProps> = ({
  onCreated,
  onBack
}) => {
  const [step, setStep] = useState<"password" | "mnemonic" | "confirm">(
    "password"
  )
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mnemonic, setMnemonic] = useState<string>("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { createWallet } = useWalletStore()

  const handleCreateWallet = async () => {
    if (password.length < 8) {
      setError("密码至少需要8个字符")
      return
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const { mnemonic: newMnemonic } = await createWallet(password)
      setMnemonic(newMnemonic)
      setSuccess("钱包创建成功！请妥善备份您的助记词。")
      setStep("mnemonic")
    } catch (error) {
      console.log(error)
      setError("钱包创建失败!")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmMnemonic = () => {
    if (!agreed) {
      setError("请确认您已安全备份助记词")
      return
    }
    setStep("confirm")
  }

  const handleComplete = () => {
    onCreated()
  }

  if (step === "password") {
    return (
      <div className="h-full plasmo-bg-[#2d3142] plasmo-p-6">
        {/* 顶部导航 */}
        <div className="plasmo-flex plasmo-items-center plasmo-mb-6">
          <button
            onClick={onBack}
            className="plasmo-p-2 plasmo-text-gray-300 hover:plasmo-bg-gray-700 plasmo-rounded-lg">
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
          <h2 className="plasmo-flex-1 plasmo-text-xl plasmo-font-semibold plasmo-text-gray-100 plasmo-text-center plasmo-mr-10">
            创建钱包
          </h2>
        </div>

        <div className="plasmo-max-w-md plasmo-mx-auto">
          <div className="plasmo-text-center plasmo-mb-6">
            <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-100">
              创建密码
            </h3>
            <p className="plasmo-text-sm plasmo-text-gray-400 plasmo-mt-1">
              此密码将用于解锁您的钱包（至少8个字符）
            </p>
          </div>

          <div className="plasmo-space-y-4">
            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
                新密码
              </label>
              <div className="plasmo-relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入新密码"
                  className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="plasmo-absolute plasmo-right-3 plasmo-top-1/2 plasmo-transform plasmo--translate-y-1/2 plasmo-text-gray-400 hover:plasmo-text-gray-200">
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
                确认密码
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50"
              />
            </div>

            {error && (
              <div className="plasmo-p-3 plasmo-bg-red-900/20 plasmo-border plasmo-border-red-800 plasmo-rounded-lg">
                <p className="plasmo-text-sm plasmo-text-red-400">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="plasmo-p-3 plasmo-bg-green-900/20 plasmo-border plasmo-border-green-800 plasmo-rounded-lg">
                <p className="plasmo-text-sm plasmo-text-green-400">
                  {success}
                </p>
              </div>
            )}

            <button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-brightness-110 plasmo-transition-all plasmo-duration-200 disabled:plasmo-opacity-50">
              {isLoading ? "创建中..." : "创建"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "mnemonic") {
    return (
      <div className="h-full plasmo-bg-[#2d3142] plasmo-p-6">
        <div className="plasmo-max-w-md plasmo-mx-auto">
          <div className="plasmo-text-center plasmo-mb-6">
            <div className="plasmo-w-12 plasmo-h-12 plasmo-bg-yellow-900/30 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-3">
              <svg
                className="plasmo-w-6 plasmo-h-6 plasmo-text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-100">
              备份助记词
            </h3>
            <p className="plasmo-text-sm plasmo-text-gray-400 plasmo-mt-2">
              请将以下助记词按顺序抄写在纸上，并妥善保管。任何人获得助记词即可控制您的资产。
            </p>
          </div>

          {/* 助记词网格 */}
          <div className="plasmo-grid plasmo-grid-cols-3 plasmo-gap-2 plasmo-p-4 plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-border-gray-600">
            {mnemonic.split(" ").map((word, index) => (
              <div
                key={index}
                className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-p-2 plasmo-bg-[#4d5262] plasmo-rounded-lg">
                <span className="plasmo-text-xs plasmo-text-gray-400 plasmo-w-6">
                  {index + 1}.
                </span>
                <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-100">
                  {word}
                </span>
              </div>
            ))}
          </div>

          {/* 确认复选框 */}
          <div className="plasmo-mt-6 plasmo-p-4 plasmo-bg-yellow-900/20 plasmo-rounded-xl plasmo-border plasmo-border-yellow-800">
            <label className="plasmo-flex plasmo-items-start plasmo-space-x-3 plasmo-cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="plasmo-mt-1 plasmo-w-4 plasmo-h-4 plasmo-text-[#c8f560] plasmo-border-gray-500 plasmo-rounded focus:plasmo-ring-[#c8f560]/50"
              />
              <span className="plasmo-text-sm plasmo-text-gray-300">
                我理解如果丢失助记词，我将无法恢复我的钱包。我已经将其安全备份。
              </span>
            </label>
          </div>

          {error && (
            <div className="plasmo-mt-4 plasmo-p-3 plasmo-bg-red-900/20 plasmo-border plasmo-border-red-800 plasmo-rounded-lg">
              <p className="plasmo-text-sm plasmo-text-red-400">
                {error}
              </p>
            </div>
          )}

          <button
            onClick={handleConfirmMnemonic}
            className="plasmo-w-full plasmo-mt-6 plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-brightness-110 plasmo-transition-all plasmo-duration-200">
            已备份，继续
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full plasmo-bg-[#2d3142] plasmo-p-6">
      <div className="plasmo-max-w-md plasmo-mx-auto plasmo-text-center">
        <div className="plasmo-w-20 plasmo-h-20 plasmo-bg-green-900/30 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-6">
          <svg
            className="plasmo-w-10 plasmo-h-10 plasmo-text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h3 className="plasmo-text-xl plasmo-font-semibold plasmo-text-gray-100 plasmo-mb-2">
          钱包创建成功！
        </h3>
        <p className="plasmo-text-gray-400 plasmo-mb-8">
          您的钱包已创建。请务必妥善保管助记词，不要与任何人分享。
        </p>

        <button
          onClick={handleComplete}
          className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-brightness-110 plasmo-transition-all plasmo-duration-200">
          开始使用钱包
        </button>
      </div>
    </div>
  )
}

export default CreateWallet
