import React, { useState } from "react"
import icon from "~/assets/icon.png"
import { useWalletStore } from "../stores/walletStore"

interface MainDashboardProps {
  onLock: () => void
  onExport: (type: "mnemonic" | "privateKey") => void
}

interface Account {
  address: string
  name: string
  balance?: string
  index: number
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  onLock,
  onExport
}) => {
  const [accounts] = useState<Account[]>([
    {
      address: "0x1234...5678",
      name: "Account 1",
      balance: "1.234 ETH",
      index: 0
    },
    {
      address: "0xabcd...efgh",
      name: "Account 2",
      balance: "0.567 ETH",
      index: 1
    }
  ])
  const [selectedAccount, setSelectedAccount] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const { lockWallet } = useWalletStore()

  const formatAddress = (address: string) => {
    if (address.length > 12) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
    return address
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  return (
    <div className="h-full plasmo-bg-[#2d3142] plasmo-min-h-[500px]">
      {/* 顶部导航栏 */}
      <div className="plasmo-bg-[#2d3142] plasmo-border-b plasmo-border-gray-700 plasmo-sticky plasmo-top-0 plasmo-z-10">
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-3">
          {/* Logo */}
          <div className="plasmo-flex plasmo-items-center plasmo-space-x-3">
            <div className="plasmo-w-8 plasmo-h-8 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-overflow-hidden">
              <img
                src={icon}
                alt="Logo"
                className="plasmo-w-full plasmo-h-full plasmo-object-cover"
              />
            </div>
            <span className="plasmo-font-semibold plasmo-text-[#c8f560]">
              MetaNodeWallet
            </span>
          </div>

          {/* 右侧菜单 */}
          <div className="plasmo-relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="plasmo-p-2 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
              <svg
                className="plasmo-w-6 plasmo-h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* 下拉菜单 */}
            {showMenu && (
              <>
                <div
                  className="plasmo-fixed plasmo-inset-0"
                  onClick={() => setShowMenu(false)}
                />
                <div className="plasmo-absolute plasmo-right-0 plasmo-top-full plasmo-mt-2 plasmo-w-48 plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-600 plasmo-py-2 plasmo-z-20">
                  <button
                    onClick={() => {
                      onExport("mnemonic")
                      setShowMenu(false)
                    }}
                    className="plasmo-w-full plasmo-px-4 plasmo-py-2 plasmo-text-left plasmo-text-sm plasmo-text-gray-300 hover:plasmo-bg-gray-700 plasmo-transition-colors">
                    导出助记词
                  </button>
                  <button
                    onClick={() => {
                      onExport("privateKey")
                      setShowMenu(false)
                    }}
                    className="plasmo-w-full plasmo-px-4 plasmo-py-2 plasmo-text-left plasmo-text-sm plasmo-text-gray-300 hover:plasmo-bg-gray-700 plasmo-transition-colors">
                    导出私钥
                  </button>
                  <div className="plasmo-my-2 plasmo-border-t plasmo-border-gray-600" />
                  <button
                    onClick={() => {
                      lockWallet()
                      onLock()
                      setShowMenu(false)
                    }}
                    className="plasmo-w-full plasmo-px-4 plasmo-py-2 plasmo-text-left plasmo-text-sm plasmo-text-red-400 hover:plasmo-bg-gray-700 plasmo-transition-colors">
                    锁定钱包
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 网络选择器 */}
        <div className="plasmo-px-4 plasmo-pb-3">
          <button className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-px-3 plasmo-py-2 plasmo-bg-[#3d4252] plasmo-rounded-lg plasmo-w-full plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
              <div className="plasmo-w-6 plasmo-h-6 plasmo-bg-[#c8f560] plasmo-rounded-full" />
              <span className="plasmo-font-medium plasmo-text-sm plasmo-text-gray-200">
                Ethereum Mainnet
              </span>
            </div>
            <svg
              className="plasmo-w-4 plasmo-h-4 plasmo-text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="plasmo-p-4">
        {/* 账户卡片 */}
        <div className="plasmo-bg-[#3d4252] plasmo-rounded-2xl plasmo-shadow-sm plasmo-border plasmo-border-gray-600 plasmo-overflow-hidden">
          {/* 选中账户信息 */}
          <div className="plasmo-p-6">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-4">
              <div className="plasmo-flex plasmo-items-center plasmo-space-x-3">
                <div className="plasmo-w-10 plasmo-h-10 plasmo-bg-[#c8f560] plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
                  <span className="plasmo-text-[#2d3142] plasmo-font-semibold">
                    {accounts[selectedAccount]?.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="plasmo-font-semibold plasmo-text-gray-100">
                    {accounts[selectedAccount]?.name}
                  </h3>
                  <p className="plasmo-text-sm plasmo-text-gray-400">
                    {formatAddress(accounts[selectedAccount]?.address || "")}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  copyAddress(accounts[selectedAccount]?.address || "")
                }
                className="plasmo-p-2 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors"
                title="复制地址">
                <svg
                  className="plasmo-w-5 plasmo-h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>

            {/* 余额 */}
            <div className="plasmo-text-center plasmo-py-4">
              <p className="plasmo-text-3xl plasmo-font-bold plasmo-text-[#c8f560]">
                {accounts[selectedAccount]?.balance || "0.000 ETH"}
              </p>
              <p className="plasmo-text-sm plasmo-text-gray-400 plasmo-mt-1">
                ≈ $2,000.00 USD
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-3 plasmo-mt-4">
              <button className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2 plasmo-py-2 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-medium plasmo-rounded-xl hover:plasmo-brightness-110 plasmo-transition-colors">
                <svg
                  className="plasmo-w-5 plasmo-h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span>发送</span>
              </button>
              <button className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2 plasmo-py-2 plasmo-px-4 plasmo-bg-[#4d5262] plasmo-text-gray-200 plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-[#5d6272] plasmo-transition-colors">
                <svg
                  className="plasmo-w-5 plasmo-h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>接收</span>
              </button>
            </div>
          </div>
        </div>

        {/* 账户列表 */}
        <div className="plasmo-mt-6">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-3">
            <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-400">
              我的账户
            </h3>
            <button
              onClick={() => setShowAddAccount(true)}
              className="plasmo-flex plasmo-items-center plasmo-space-x-1 plasmo-text-sm plasmo-text-[#c8f560] hover:plasmo-brightness-110">
              <svg
                className="plasmo-w-4 plasmo-h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>新增账户</span>
            </button>
          </div>

          <div className="plasmo-space-y-2">
            {accounts.map((account, index) => (
              <button
                key={index}
                onClick={() => setSelectedAccount(index)}
                className={`plasmo-w-full plasmo-flex plasmo-items-center plasmo-space-x-3 plasmo-p-3 plasmo-rounded-xl plasmo-transition-all ${
                  selectedAccount === index
                    ? "plasmo-bg-[#4d5262] plasmo-border plasmo-border-[#c8f560]/30"
                    : "plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 hover:plasmo-bg-[#4d5262]"
                }`}>
                <div className="plasmo-w-8 plasmo-h-8 plasmo-bg-[#c8f560] plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
                  <span className="plasmo-text-[#2d3142] plasmo-font-semibold plasmo-text-sm">
                    {account.name.charAt(0)}
                  </span>
                </div>
                <div className="plasmo-flex-1 plasmo-text-left">
                  <p className="plasmo-font-medium plasmo-text-gray-200">
                    {account.name}
                  </p>
                  <p className="plasmo-text-xs plasmo-text-gray-500">
                    {formatAddress(account.address)}
                  </p>
                </div>
                <div className="plasmo-text-right">
                  <p className="plasmo-font-medium plasmo-text-gray-200 plasmo-text-sm">
                    {account.balance}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Token 列表 */}
        <div className="plasmo-mt-6">
          <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-400 plasmo-mb-3">
            Token
          </h3>
          <div className="plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-border-gray-600">
            <div className="plasmo-flex plasmo-items-center plasmo-space-x-3 plasmo-p-4">
              <div className="plasmo-w-10 plasmo-h-10 plasmo-bg-[#c8f560] plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
                <span className="plasmo-text-[#2d3142] plasmo-font-bold plasmo-text-xs">
                  ETH
                </span>
              </div>
              <div className="plasmo-flex-1">
                <p className="plasmo-font-medium plasmo-text-gray-200">
                  Ethereum
                </p>
                <p className="plasmo-text-sm plasmo-text-gray-500">ETH</p>
              </div>
              <div className="plasmo-text-right">
                <p className="plasmo-font-medium plasmo-text-gray-200">
                  {accounts[selectedAccount]?.balance || "0.000 ETH"}
                </p>
                <p className="plasmo-text-sm plasmo-text-gray-500">≈ $2,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 新增账户模态框 */}
      {showAddAccount && (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/60 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
          <div className="plasmo-bg-[#3d4252] plasmo-rounded-2xl plasmo-w-full plasmo-max-w-sm plasmo-p-6 plasmo-border plasmo-border-gray-600">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-6">
              <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-100">
                新增账户
              </h3>
              <button
                onClick={() => setShowAddAccount(false)}
                className="plasmo-p-2 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg">
                <svg
                  className="plasmo-w-5 plasmo-h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="plasmo-text-sm plasmo-text-gray-400 plasmo-mb-4">
              将从您的助记词创建一个新账户。无需支付费用。
            </p>

            <div className="plasmo-text-xs plasmo-text-gray-500 plasmo-p-3 plasmo-bg-[#2d3142] plasmo-rounded-lg plasmo-mb-6">
              <strong className="plasmo-text-[#c8f560]">
                Account {accounts.length + 1}
              </strong>{" "}
              <span className="plasmo-text-gray-400">将使用路径</span>{" "}
              <code className="plasmo-bg-[#4d5262] plasmo-text-[#c8f560] plasmo-px-1 plasmo-rounded">
                m/44'/60'/0'/0/{accounts.length}
              </code>
            </div>

            <button
              onClick={() => setShowAddAccount(false)}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 plasmo-transition-colors">
              创建账户
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainDashboard
