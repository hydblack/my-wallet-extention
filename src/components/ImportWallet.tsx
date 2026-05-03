import React, { useState } from "react"
import { useWalletStore } from "../stores/walletStore"

interface ImportWalletProps {
  onImported: () => void
  onBack: () => void
}

export const ImportWallet: React.FC<ImportWalletProps> = ({
  onImported,
  onBack
}) => {
  const [importType, setImportType] = useState<"mnemonic" | "privateKey">(
    "mnemonic"
  )
  const [mnemonic, setMnemonic] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [walletName, setWalletName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { importWallet, importPrivateKey } = useWalletStore()

  const handleImport = async () => {
    if (password.length < 8) {
      setError("密码至少需要8个字符")
      return
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    if (importType === "mnemonic" && !mnemonic.trim()) {
      setError("请输入助记词")
      return
    }
    if (importType === "privateKey" && !privateKey.trim()) {
      setError("请输入私钥")
      return
    }
    setIsLoading(true)
    setError("")

    try {
      if (importType === "mnemonic") {
        await importWallet(mnemonic, password)
      } else {
        await importPrivateKey(privateKey, password, walletName)
      }
      onImported()
    } catch (err) {
      setError("导入失败，请检查助记词或私钥是否正确")
    }

    setTimeout(() => {
      onImported()
      setIsLoading(false)
    }, 1500)
  }

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
          导入钱包
        </h2>
      </div>

      {/* 导入类型选择 */}
      <div className="plasmo-max-w-md plasmo-mx-auto">
        <div className="plasmo-flex plasmo-space-x-2 plasmo-mb-6">
          <button
            onClick={() => {
              setImportType("mnemonic")
              setError("")
            }}
            className={`plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-font-semibold plasmo-rounded-xl plasmo-transition-all plasmo-duration-200 ${
              importType === "mnemonic"
                ? "plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-shadow-md"
                : "plasmo-bg-[#3d4252] plasmo-text-gray-300 plasmo-border plasmo-border-gray-600"
            }`}>
            助记词
          </button>
          <button
            onClick={() => {
              setImportType("privateKey")
              setError("")
            }}
            className={`plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-font-semibold plasmo-rounded-xl plasmo-transition-all plasmo-duration-200 ${
              importType === "privateKey"
                ? "plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-shadow-md"
                : "plasmo-bg-[#3d4252] plasmo-text-gray-300 plasmo-border plasmo-border-gray-600"
            }`}>
            私钥
          </button>
        </div>

        {/* 助记词导入 */}
        {importType === "mnemonic" && (
          <div className="plasmo-space-y-4">
            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
                助记词
              </label>
              <textarea
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="请输入助记词，用空格分隔"
                rows={4}
                className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50 plasmo-resize-none"
              />
              <p className="plasmo-mt-2 plasmo-text-xs plasmo-text-gray-400">
                多个单词用空格分隔，通常是12个或24个单词
              </p>
            </div>
          </div>
        )}

        {/* 私钥导入 */}
        {importType === "privateKey" && (
          <div className="plasmo-space-y-4">
            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
                账户名称
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="例如：我的钱包"
                className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50"
              />
            </div>

            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
                私钥
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="请输入私钥"
                rows={3}
                className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50 plasmo-resize-none plasmo-font-mono"
              />
              <p className="plasmo-mt-2 plasmo-text-xs plasmo-text-red-400">
                ⚠️ 切勿将私钥透露给任何人！我们不会向您索要私钥
              </p>
            </div>
          </div>
        )}

        {/* 密码设置 */}
        <div className="plasmo-space-y-4 plasmo-mt-4">
          <div>
            <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
              设置密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码（至少8个字符）"
              className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50"
            />
          </div>

          <div>
            <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-300 plasmo-mb-2">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="plasmo-w-full plasmo-px-4 plasmo-py-3 plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-xl plasmo-text-gray-100 plasmo-placeholder-gray-500 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#c8f560]/50"
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="plasmo-mt-4 plasmo-p-3 plasmo-bg-red-900/20 plasmo-border plasmo-border-red-800 plasmo-rounded-lg">
            <p className="plasmo-text-sm plasmo-text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* 导入按钮 */}
        <button
          onClick={handleImport}
          disabled={isLoading}
          className="plasmo-w-full plasmo-mt-6 plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl plasmo-shadow-md hover:plasmo-brightness-110 plasmo-transition-all plasmo-duration-200 disabled:plasmo-opacity-50 disabled:plasmo-cursor-not-allowed">
          {isLoading ? "导入中..." : "导入"}
        </button>

        {/* 提示信息 */}
        <p className="plasmo-mt-4 plasmo-text-xs plasmo-text-gray-400 plasmo-text-center">
          导入后，您的钱包将使用新设置的密码进行加密保护
        </p>
      </div>
    </div>
  )
}

export default ImportWallet
