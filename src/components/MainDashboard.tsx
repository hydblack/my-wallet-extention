import { AES, enc } from "crypto-js"
import { ethers } from "ethers"
import React, { useCallback, useEffect, useState } from "react"

import icon from "~/assets/icon.png"

import { useWalletBalance } from "../hooks/useWalletBalance"
import { useWalletStore } from "../stores/walletStore"
import { useTransactionStore } from "../stores/transactionStore"
import type { TransactionRecord } from "../types/transaction"

interface MainDashboardProps {
  onLock: () => void
  onExport: (type: "mnemonic" | "privateKey") => void
}

interface Account {
  address: string
  name: string
  ethBalance?: string
  index: number
}

interface NewTokenForm {
  address: string
  symbol: string
  name: string
  decimals: number
}

const INITIAL_TOKEN_FORM: NewTokenForm = {
  address: "",
  symbol: "",
  name: "",
  decimals: 18
}

// ─── 活动列表项组件 ─────────────────────────────────────────────────────

interface ActivityItemProps {
  record: TransactionRecord
  isExpanded: boolean
  onToggle: () => void
}

const ActivityItem: React.FC<ActivityItemProps> = ({ record, isExpanded, onToggle }) => {
  const formatAddr = (addr?: string) => {
    if (!addr) return "—"
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatValue = (value?: string) => {
    if (!value || value === "0x0" || value === "0") return null
    try {
      return ethers.formatEther(value)
    } catch {
      return null
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return "刚刚"
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} 小时前`
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  }

  const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
    confirmed: { icon: "✅", color: "plasmo-text-green-400", label: "已确认" },
    rejected: { icon: "❌", color: "plasmo-text-red-400", label: "已拒绝" },
    failed: { icon: "⚠️", color: "plasmo-text-yellow-400", label: "失败" },
    pending: { icon: "⏳", color: "plasmo-text-blue-400", label: "待确认" },
  }

  const status = statusConfig[record.status] || statusConfig.pending
  const hasData = record.tx.data && record.tx.data !== "0x" && record.tx.data !== "0x0"
  const valueDisplay = formatValue(record.tx.value)
  const actionLabel = hasData ? "合约交互" : "ETH 转账"

  return (
    <div
      className={`plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-transition-colors cursor-pointer ${
        isExpanded ? "plasmo-border-[#c8f560]/30" : "plasmo-border-gray-600 hover:plasmo-border-gray-500"
      }`}
      onClick={onToggle}>
      {/* 主信息行 */}
      <div className="plasmo-p-3 plasmo-flex plasmo-items-center plasmo-space-x-3">
        {/* 状态图标 */}
        <span className="plasmo-text-base plasmo-flex-shrink-0">{status.icon}</span>

        {/* 操作信息 */}
        <div className="plasmo-flex-1 plasmo-min-w-0">
          <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
            <span className={`plasmo-text-xs plasmo-font-medium ${status.color}`}>{actionLabel}</span>
            <span className={`plasmo-text-[10px] plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-full plasmo-bg-gray-700 plasmo-text-gray-400`}>
              {status.label}
            </span>
          </div>
          <div className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-mt-0.5">
            <span className="plasmo-text-xs plasmo-text-gray-500 plasmo-font-mono">{formatAddr(record.tx.to)}</span>
            {record.origin && (
              <>
                <span className="plasmo-text-gray-700">·</span>
                <span className="plasmo-text-xs plasmo-text-gray-600 plasmo-truncate">{record.origin}</span>
              </>
            )}
          </div>
        </div>

        {/* 右侧 */}
        <div className="plasmo-text-right plasmo-flex-shrink-0">
          {valueDisplay && (
            <p className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-200">
              {parseFloat(valueDisplay).toFixed(4)} ETH
            </p>
          )}
          <p className="plasmo-text-[10px] plasmo-text-gray-600">{formatTime(record.timestamp)}</p>
        </div>
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="plasmo-border-t plasmo-border-gray-600 plasmo-px-3 plasmo-py-3 plasmo-space-y-2 plasmo-bg-[#2d3142]/50 plasmo-rounded-b-xl">
          <div className="plasmo-flex plasmo-justify-between">
            <span className="plasmo-text-[10px] plasmo-text-gray-600">请求 ID</span>
            <span className="plasmo-text-[10px] plasmo-text-gray-400 plasmo-font-mono">{record.requestId}</span>
          </div>

          {record.hash && (
            <div className="plasmo-flex plasmo-justify-between">
              <span className="plasmo-text-[10px] plasmo-text-gray-600">交易哈希</span>
              <span className="plasmo-text-[10px] plasmo-text-gray-400 plasmo-font-mono">{record.hash}</span>
            </div>
          )}

          <div className="plasmo-flex plasmo-justify-between">
            <span className="plasmo-text-[10px] plasmo-text-gray-600">From</span>
            <span className="plasmo-text-[10px] plasmo-text-gray-400 plasmo-font-mono">{formatAddr(record.tx.from)}</span>
          </div>

          <div className="plasmo-flex plasmo-justify-between">
            <span className="plasmo-text-[10px] plasmo-text-gray-600">To</span>
            <span className="plasmo-text-[10px] plasmo-text-gray-400 plasmo-font-mono">{formatAddr(record.tx.to)}</span>
          </div>

          {record.estimatedGasFee && (
            <div className="plasmo-flex plasmo-justify-between">
              <span className="plasmo-text-[10px] plasmo-text-gray-600">手续费</span>
              <span className="plasmo-text-[10px] plasmo-text-[#c8f560]">{record.estimatedGasFee}</span>
            </div>
          )}

          {record.error && (
            <div className="plasmo-pt-1 plasmo-border-t plasmo-border-gray-600">
              <span className="plasmo-text-[10px] plasmo-text-gray-600">错误信息</span>
              <p className="plasmo-text-[10px] plasmo-text-red-400 plasmo-mt-0.5 plasmo-break-all">{record.error}</p>
            </div>
          )}

          {hasData && (
            <div className="plasmo-pt-1 plasmo-border-t plasmo-border-gray-600">
              <span className="plasmo-text-[10px] plasmo-text-gray-600">调用数据</span>
              <pre className="plasmo-text-[9px] plasmo-text-gray-500 plasmo-font-mono plasmo-break-all plasmo-whitespace-pre-wrap plasmo-mt-0.5 plasmo-max-h-20 plasmo-overflow-y-auto">
                {record.tx.data}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  onLock,
  onExport
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showNetworkSelector, setShowNetworkSelector] = useState(false)
  const [showAddToken, setShowAddToken] = useState(false)
  const [newToken, setNewToken] = useState<NewTokenForm>(INITIAL_TOKEN_FORM)
  const [isDetecting, setIsDetecting] = useState(false)
  const [toast, setToast] = useState<{
    title: string
    description?: string
    variant?: "default" | "destructive"
  } | null>(null)

  // ── 转账相关状态 ──
  const [showSendModal, setShowSendModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [sendForm, setSendForm] = useState({
    to: "",
    amount: "",
  })
  const [sendPassword, setSendPassword] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [txHash, setTxHash] = useState("")
  // ── 自动计算的 Gas 信息 ──
  const [estimatedGasLimit, setEstimatedGasLimit] = useState<bigint | null>(null)
  const [feeData, setFeeData] = useState<{
    gasPrice: bigint | null
    maxFeePerGas: bigint | null
    maxPriorityFeePerGas: bigint | null
  } | null>(null)
  const [isEstimatingGas, setIsEstimatingGas] = useState(false)

  // ── Tab 切换状态 ──
  const [activeTab, setActiveTab] = useState<'tokens' | 'activity'>('tokens')
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  // ── 交易 Store ──
  const { transactionHistory, clearHistory } = useTransactionStore()

  const {
    lockWallet,
    accounts,
    createAccount,
    currentAccount,
    currentNetwork,
    networks,
    switchNetwork,
    switchAccount,
    addToken,
    removeToken,
    tokens,
    getProvider,
    isValidPassword
  } = useWalletStore()
  const { ethBalance, refreshBalances } = useWalletBalance()
  console.log("MainDashboard - currentAccount:", currentAccount)
  console.log("MainDashboard - ethBalance:", ethBalance)
  console.log("MainDashboard - tokens:", tokens)

  const showToast = (
    title: string,
    description?: string,
    variant?: "default" | "destructive"
  ) => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 3000)
  }

  const detectTokenInfo = async () => {
    if (!newToken.address || !ethers.isAddress(newToken.address)) {
      showToast("无效的合约地址", undefined, "destructive")
      return
    }

    setIsDetecting(true)
    try {
      const provider = getProvider()
      if (!provider) {
        throw new Error("无法连接到网络")
      }

      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
      ]

      const contract = new ethers.Contract(newToken.address, erc20Abi, provider)

      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ])

      setNewToken((prev) => ({
        ...prev,
        name,
        symbol,
        decimals: Number(decimals)
      }))

      showToast("代币信息检测成功", `${symbol} (${name})`)
    } catch (error) {
      console.error("Token detection error:", error)
      showToast("检测失败", "无法获取代币信息，请手动填写", "destructive")
    } finally {
      setIsDetecting(false)
    }
  }

  const handleAddToken = () => {
    if (!newToken.address || !newToken.symbol || !newToken.name) {
      showToast("请填写必填字段", "合约地址、符号和名称为必填项", "destructive")
      return
    }

    if (!ethers.isAddress(newToken.address)) {
      showToast("无效的合约地址", undefined, "destructive")
      return
    }

    const token = {
      address: newToken.address,
      symbol: newToken.symbol,
      name: newToken.name,
      decimals: newToken.decimals ?? 18,
      type: "ERC20" as const
    }

    try {
      addToken(token)
      setShowAddToken(false)
      setNewToken(INITIAL_TOKEN_FORM)
      showToast("代币添加成功！", `${token.symbol} 已添加到代币列表`)
    } catch (error) {
      showToast("添加失败", "无法添加代币", "destructive")
    }
  }

  const openAddTokenDialog = () => {
    setNewToken(INITIAL_TOKEN_FORM)
    setShowAddToken(true)
  }

  // ── 转账辅助函数 ──

  // ── Gas 自动估算（MetaMask 风格）──
  // 获取网络费率 + 自动估算 Gas Limit，无需用户手动输入
  const fetchGasAndEstimate = useCallback(async () => {
    const provider = getProvider()
    if (!provider || !sendForm.to || !sendForm.amount) return
    if (!ethers.isAddress(sendForm.to) || parseFloat(sendForm.amount) <= 0) return

    setIsEstimatingGas(true)
    try {
      // 1. 获取网络费率（EIP-1559 自动用 maxFeePerGas，旧链用 gasPrice）
      const fee = await provider.getFeeData()
      setFeeData({
        gasPrice: fee.gasPrice,
        maxFeePerGas: fee.maxFeePerGas,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      })

      // 2. 构造 tx 对象，用 eth_estimateGas 获取 Gas Limit
      const txRequest: ethers.TransactionRequest = {
        from: currentAccount?.address,
        to: sendForm.to,
        value: ethers.parseEther(sendForm.amount),
      }

      const estimated = await provider.estimateGas(txRequest)
      // MetaMask 会留 ~20% 余量，防止合约内部状态变化导致 out of gas
      setEstimatedGasLimit((estimated * 120n) / 100n)
    } catch (e) {
      // 估算失败时使用安全默认值
      setEstimatedGasLimit(21000n)
      if (!feeData) {
        setFeeData({
          gasPrice: ethers.parseUnits("5", "gwei"),
          maxFeePerGas: null,
          maxPriorityFeePerGas: null,
        })
      }
    } finally {
      setIsEstimatingGas(false)
    }
  }, [getProvider, sendForm.to, sendForm.amount, currentAccount])

  const openSendModal = () => {
    setSendForm({ to: "", amount: "" })
    setSendPassword("")
    setTxHash("")
    setShowSendModal(true)
    setShowConfirmDialog(false)
    setEstimatedGasLimit(null)
    setFeeData(null)
  }

  // 表单关键字段变化时自动重新估算 Gas
  useEffect(() => {
    if (
      sendForm.to &&
      sendForm.amount &&
      ethers.isAddress(sendForm.to) &&
      parseFloat(sendForm.amount) > 0
    ) {
      fetchGasAndEstimate()
    } else {
      setEstimatedGasLimit(null)
      setFeeData(null)
    }
  }, [sendForm.to, sendForm.amount, fetchGasAndEstimate])

  const getTokenBalance = () => {
    const raw = ethBalance?.replace(/[^\d.]/g, "") || "0"
    return raw
  }

  // 计算当前预估手续费（ETH 单位，最多 8 位小数）
  const estimateGasFee = (): string => {
    if (!estimatedGasLimit || !feeData) return "计算中..."
    const gasLimit = estimatedGasLimit
    const pricePerUnit = feeData.maxFeePerGas || feeData.gasPrice || 0n
    const feeWei = gasLimit * pricePerUnit
    // 转成 ETH 字符串，去掉末尾多余的 0
    const ethStr = ethers.formatEther(feeWei)
    const num = parseFloat(ethStr)
    if (isNaN(num)) return "0.00000000 ETH"
    // 最多保留 8 位小数，去掉末尾零
    return `${parseFloat(num.toFixed(8))} ETH`
  }

  const isValidSendForm = () => {
    if (!sendForm.to || !sendForm.amount || parseFloat(sendForm.amount) <= 0)
      return false
    if (!ethers.isAddress(sendForm.to)) return false
    return true
  }

  const handleSendSubmit = () => {
    if (!isValidSendForm()) {
      showToast("请填写完整且有效的转账信息", undefined, "destructive")
      return
    }
    setShowConfirmDialog(true)
  }

  const resetSendState = () => {
    setShowSendModal(false)
    setShowConfirmDialog(false)
    setSendPassword("")
    setIsSending(false)
  }

  const executeTransaction = async () => {
    if (!sendPassword) {
      showToast("请输入密码", undefined, "destructive")
      return
    }

    if (!isValidPassword(sendPassword)) {
      showToast("密码错误", "请检查您的密码", "destructive")
      return
    }

    if (!currentAccount) return

    setIsSending(true)
    try {
      const provider = getProvider()
      if (!provider) throw new Error("无法连接到网络")

      const decryptedPrivateKey = AES.decrypt(
        currentAccount.privateKey,
        sendPassword
      ).toString(enc.Utf8)

      const wallet = new ethers.Wallet(decryptedPrivateKey, provider)

      // ETH 转账
      const tx = await wallet.sendTransaction({
        to: sendForm.to,
        value: ethers.parseEther(sendForm.amount),
        gasLimit: estimatedGasLimit || 21000n,
        ...(feeData?.maxFeePerGas
          ? {
              maxFeePerGas: feeData.maxFeePerGas,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n,
            }
          : { gasPrice: feeData?.gasPrice || ethers.parseUnits("5", "gwei") }),
      })

      setTxHash(tx.hash)
      showToast("交易已发送", `交易哈希: ${tx.hash.slice(0, 10)}...`)

      // 等待交易确认
      await tx.wait()

      // 交易成功后：关闭弹窗 + 刷新余额
      showToast("交易成功！", "交易已被确认")
      resetSendState()
      // 刷新余额
      refreshBalances()
    } catch (error: any) {
      console.error("Transaction error:", error)
      showToast(
        "交易失败",
        error?.message || "发送交易时出现错误",
        "destructive"
      )
    } finally {
      setIsSending(false)
      setSendPassword("")
    }
  }

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
        <div className="plasmo-px-4 plasmo-pb-3 plasmo-relative">
          <button
            onClick={() => setShowNetworkSelector(!showNetworkSelector)}
            className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-px-3 plasmo-py-2 plasmo-bg-[#3d4252] plasmo-rounded-lg plasmo-w-full plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
              <div className="plasmo-w-6 plasmo-h-6 plasmo-bg-[#c8f560] plasmo-rounded-full" />
              <span className="plasmo-font-medium plasmo-text-sm plasmo-text-gray-200">
                {currentNetwork?.name || "选择网络"}
              </span>
            </div>
            <svg
              className={`plasmo-w-4 plasmo-h-4 plasmo-text-gray-500 plasmo-transition-transform ${showNetworkSelector ? "plasmo-rotate-180" : ""}`}
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

          {/* 网络下拉列表 */}
          {showNetworkSelector && (
            <>
              <div
                className="plasmo-fixed plasmo-inset-0"
                onClick={() => setShowNetworkSelector(false)}
              />
              <div className="plasmo-absolute plasmo-left-4 plasmo-right-4 plasmo-top-full plasmo-mt-1 plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-shadow-lg plasmo-border plasmo-border-gray-600 plasmo-py-1 plasmo-z-20">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => {
                      switchNetwork(network.id)
                      setShowNetworkSelector(false)
                    }}
                    className={`plasmo-w-full plasmo-flex plasmo-items-center plasmo-space-x-3 plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-transition-colors ${
                      currentNetwork?.id === network.id
                        ? "plasmo-text-[#c8f560] plasmo-bg-[#4d5262]"
                        : "plasmo-text-gray-300 hover:plasmo-bg-gray-700"
                    }`}>
                    <div
                      className={`plasmo-w-2 plasmo-h-2 plasmo-rounded-full plasmo-flex-shrink-0 ${currentNetwork?.id === network.id ? "plasmo-bg-[#c8f560]" : "plasmo-bg-gray-500"}`}
                    />
                    <span className="plasmo-flex-1 plasmo-text-left">
                      {network.name}
                    </span>
                    <span className="plasmo-text-xs plasmo-text-gray-500">
                      {network.symbol}
                    </span>
                    {currentNetwork?.id === network.id && (
                      <svg
                        className="plasmo-w-4 plasmo-h-4 plasmo-text-[#c8f560]"
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
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
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
                    {currentAccount?.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="plasmo-font-semibold plasmo-text-gray-100">
                    {currentAccount?.name}
                  </h3>
                  <p className="plasmo-text-sm plasmo-text-gray-400">
                    {formatAddress(currentAccount?.address || "")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyAddress(currentAccount?.address || "")}
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
                {ethBalance || "0.0000 ETH"}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-3 plasmo-mt-4">
              <button
                onClick={openSendModal}
                className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2 plasmo-py-2 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-medium plasmo-rounded-xl hover:plasmo-brightness-110 plasmo-transition-colors">
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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentAccount?.address || "")
                  showToast("地址已复制", undefined)
                }}
                className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-2 plasmo-py-2 plasmo-px-4 plasmo-bg-[#4d5262] plasmo-text-gray-200 plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-[#5d6272] plasmo-transition-colors">
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
                <span>复制地址</span>
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
                onClick={() => switchAccount(account.address)}
                className={`plasmo-w-full plasmo-flex plasmo-items-center plasmo-space-x-3 plasmo-p-3 plasmo-rounded-xl plasmo-transition-all ${
                  currentAccount?.address === account.address
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
                    {account.ethBalance || "0.0000 ETH"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 切换 + 列表区域 */}
        <div className="plasmo-mt-6">
          {/* Tab 栏 */}
          <div className="plasmo-flex plasmo-space-x-1 plasmo-mb-3 plasmo-bg-[#2d3142] plasmo-p-1 plasmo-rounded-lg">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`plasmo-flex-1 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-transition-colors ${
                activeTab === 'tokens'
                  ? 'plasmo-bg-[#3d4252] plasmo-text-gray-100'
                  : 'plasmo-text-gray-500 hover:plasmo-text-gray-300'
              }`}>
              代币
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`plasmo-flex-1 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-transition-colors relative ${
                activeTab === 'activity'
                  ? 'plasmo-bg-[#3d4252] plasmo-text-gray-100'
                  : 'plasmo-text-gray-500 hover:plasmo-text-gray-300'
              }`}>
              活动
              {transactionHistory.length > 0 && (
                <span className="plasmo-ml-1 plasmo-text-[10px] plasmo-bg-[#c8f560]/20 plasmo-text-[#c8f560] plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-full">
                  {transactionHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* 代币 Tab */}
          {activeTab === 'tokens' && (
            <>
              <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-3">
                <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-400">
                  我的代币
                </h3>
                <button
                  onClick={openAddTokenDialog}
                  className="plasmo-flex plasmo-items-center plasmo-space-x-1 plasmo-text-sm plasmo-text-[#c8f560] hover:plasmo-brightness-110">
                  <svg className="plasmo-w-4 plasmo-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>添加代币</span>
                </button>
              </div>
              <div className="plasmo-space-y-2">
                {tokens.length === 0 && (
                  <div className="plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-border-gray-600 plasmo-p-6 plasmo-text-center">
                    <p className="plasmo-text-sm plasmo-text-gray-500">暂无代币</p>
                    <button
                      onClick={openAddTokenDialog}
                      className="plasmo-mt-3 plasmo-text-sm plasmo-text-[#c8f560] hover:plasmo-brightness-110">
                      + 添加第一个代币
                    </button>
                  </div>
                )}
                {tokens.map((token) => (
                  <div
                    key={token.address}
                    className="plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-border-gray-600 plasmo-p-4 plasmo-flex plasmo-items-center plasmo-space-x-3">
                    <div className="plasmo-flex-1">
                      <p className="plasmo-font-medium plasmo-text-gray-200">{token.symbol}</p>
                      <p className="plasmo-text-sm plasmo-text-gray-500">{token.name}</p>
                    </div>
                    <div className="plasmo-text-right">
                      <p className="plasmo-font-medium plasmo-text-gray-200 plasmo-text-sm">
                        {token.balance ? Number(token.balance).toFixed(4) : "0.0000"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeToken(token.address)}
                      className="plasmo-p-1 plasmo-text-gray-500 hover:plasmo-text-red-400 plasmo-transition-colors"
                      title="移除代币">
                      <svg className="plasmo-w-4 plasmo-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 活动 Tab */}
          {activeTab === 'activity' && (
            <div>
              <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-3">
                <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-400">交易记录</h3>
                {transactionHistory.length > 0 && (
                  <button
                    onClick={() => clearHistory()}
                    className="plasmo-text-xs plasmo-text-gray-500 hover:plasmo-text-red-400 plasmo-transition-colors">
                    清空历史
                  </button>
                )}
              </div>

              {transactionHistory.length === 0 ? (
                <div className="plasmo-bg-[#3d4252] plasmo-rounded-xl plasmo-border plasmo-border-gray-600 plasmo-p-8 plasmo-text-center">
                  <svg className="plasmo-w-10 plasmo-h-10 plasmo-text-gray-600 plasmo-mx-auto plasmo-mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="plasmo-text-sm plasmo-text-gray-500">暂无交易记录</p>
                  <p className="plasmo-text-xs plasmo-text-gray-600 plasmo-mt-1">来自 DApp 的交易请求会显示在这里</p>
                </div>
              ) : (
                <div className="plasmo-space-y-2">
                  {transactionHistory.map((record) => (
                    <ActivityItem
                      key={record.requestId}
                      record={record}
                      isExpanded={expandedTxId === record.requestId}
                      onToggle={() => setExpandedTxId(
                        expandedTxId === record.requestId ? null : record.requestId
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
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
              onClick={() => {
                createAccount()
                setShowAddAccount(false)
              }}
              className="plasmo-w-full plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 plasmo-transition-colors">
              创建账户
            </button>
          </div>
        </div>
      )}

      {/* 新增代币弹窗 */}
      {showAddToken && (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/60 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
          <div className="plasmo-bg-[#3d4252] plasmo-rounded-2xl plasmo-w-full plasmo-max-w-sm plasmo-border plasmo-border-gray-600">
            {/* 弹窗标题 */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-6 plasmo-pt-6 plasmo-pb-4 plasmo-border-b plasmo-border-gray-600">
              <h3 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-100">
                添加 ERC20 代币
              </h3>
              <button
                onClick={() => setShowAddToken(false)}
                className="plasmo-p-2 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
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

            <div className="plasmo-px-6 plasmo-py-5 plasmo-space-y-4">
              {/* 合约地址 + 检测按钮 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1">
                  合约地址 <span className="plasmo-text-red-400">*</span>
                </label>
                <div className="plasmo-flex plasmo-space-x-2">
                  <input
                    type="text"
                    value={newToken.address}
                    onChange={(e) =>
                      setNewToken((prev) => ({
                        ...prev,
                        address: e.target.value.trim()
                      }))
                    }
                    placeholder="0x..."
                    className="plasmo-flex-1 plasmo-min-w-0 plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                  />
                  <button
                    onClick={detectTokenInfo}
                    disabled={isDetecting || !newToken.address}
                    className="plasmo-flex-shrink-0 plasmo-px-3 plasmo-py-2 plasmo-bg-[#4d5262] plasmo-text-xs plasmo-font-medium plasmo-text-[#c8f560] plasmo-rounded-lg hover:plasmo-bg-[#5d6272] disabled:plasmo-opacity-40 disabled:plasmo-cursor-not-allowed plasmo-transition-colors plasmo-whitespace-nowrap">
                    {isDetecting ? (
                      <span className="plasmo-flex plasmo-items-center plasmo-space-x-1">
                        <svg
                          className="plasmo-w-3 plasmo-h-3 plasmo-animate-spin"
                          fill="none"
                          viewBox="0 0 24 24">
                          <circle
                            className="plasmo-opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="plasmo-opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span>检测中</span>
                      </span>
                    ) : (
                      "自动检测"
                    )}
                  </button>
                </div>
              </div>

              {/* 代币符号 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1">
                  代币符号 <span className="plasmo-text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newToken.symbol}
                  onChange={(e) =>
                    setNewToken((prev) => ({ ...prev, symbol: e.target.value }))
                  }
                  placeholder="如 USDT"
                  className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                />
              </div>

              {/* 代币名称 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1">
                  代币名称 <span className="plasmo-text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) =>
                    setNewToken((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="如 Tether USD"
                  className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                />
              </div>

              {/* 小数位数 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1">
                  小数位数
                  <span className="plasmo-ml-1 plasmo-text-gray-600">
                    (默认 18)
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={newToken.decimals}
                  onChange={(e) =>
                    setNewToken((prev) => ({
                      ...prev,
                      decimals: parseInt(e.target.value, 10) || 0
                    }))
                  }
                  className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-200 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="plasmo-flex plasmo-space-x-3 plasmo-px-6 plasmo-pb-6">
              <button
                onClick={() => setShowAddToken(false)}
                className="plasmo-flex-1 plasmo-py-2.5 plasmo-px-4 plasmo-bg-[#4d5262] plasmo-text-gray-300 plasmo-text-sm plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-[#5d6272] plasmo-transition-colors">
                取消
              </button>
              <button
                onClick={handleAddToken}
                disabled={
                  !newToken.address || !newToken.symbol || !newToken.name
                }
                className="plasmo-flex-1 plasmo-py-2.5 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-text-sm plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 disabled:plasmo-opacity-40 disabled:plasmo-cursor-not-allowed plasmo-transition-colors">
                添加代币
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送弹窗 */}
      {showSendModal && !showConfirmDialog && (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/60 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
          <div className="plasmo-bg-[#3d4252] plasmo-rounded-2xl plasmo-w-full plasmo-max-w-sm plasmo-border plasmo-border-gray-600">
            {/* 标题栏 */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-5 plasmo-pt-5 plasmo-pb-4 plasmo-border-b plasmo-border-gray-600">
              <h3 className="plasmo-text-base plasmo-font-semibold plasmo-text-gray-100">
                发送
              </h3>
              <button
                onClick={resetSendState}
                className="plasmo-p-1.5 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
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

            <div className="plasmo-px-5 plasmo-py-4 plasmo-space-y-3">
              {/* 资产（仅支持 ETH） */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1.5">
                  资产
                </label>
                <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-3 plasmo-py-2.5 plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg">
                  <span className="plasmo-flex plasmo-items-center plasmo-space-x-2">
                    <div className="plasmo-w-5 plasmo-h-5 plasmo-bg-[#c8f560] plasmo-rounded-full" />
                    <span className="plasmo-text-sm plasmo-text-gray-200">ETH</span>
                  </span>
                  <span className="plasmo-text-xs plasmo-text-gray-500">
                    余额: {getTokenBalance()}
                  </span>
                </div>
              </div>

              {/* 收款地址 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1.5">
                  收款地址
                </label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) =>
                    setSendForm((f) => ({ ...f, to: e.target.value.trim() }))
                  }
                  placeholder="0x..."
                  className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2.5 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors plasmo-font-mono"
                />
              </div>

              {/* 金额 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1.5">
                  金额
                </label>
                <div className="plasmo-relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={sendForm.amount}
                    onChange={(e) =>
                      setSendForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.0"
                    className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2.5 plasmo-pr-16 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                  />
                  <span className="plasmo-absolute plasmo-right-3 plasmo-top-1/2 plasmo--translate-y-1/2 plasmo-text-xs plasmo-text-gray-500">
                    ETH
                  </span>
                </div>
              </div>

              {/* 手续费（自动估算） */}
              <div className="plasmo-space-y-2">
                <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                  <span className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-400">
                    网络手续费
                  </span>
                  {isEstimatingGas && (
                    <span className="plasmo-text-xs plasmo-text-gray-500">估算中...</span>
                  )}
                </div>
                <div className="plasmo-bg-[#2d3142] plasmo-rounded-lg plasmo-px-3 plasmo-py-2.5 plasmo-text-center">
                  <span className="plasmo-text-sm plasmo-font-semibold plasmo-text-[#c8f560]">
                    {isEstimatingGas
                      ? "计算中..."
                      : (estimatedGasLimit
                          ? `${estimateGasFee()} ETH`
                          : "填写收款地址和金额后自动计算")}
                  </span>
                  {feeData && estimatedGasLimit && (
                    <p className="plasmo-text-[11px] plasmo-text-gray-500 plasmo-mt-1">
                      Gas Limit: {estimatedGasLimit.toString()}{" "}
                      · {feeData.maxFeePerGas ? "EIP-1559" : "Legacy"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="plasmo-px-5 plasmo-pb-5">
              <button
                onClick={handleSendSubmit}
                disabled={!isValidSendForm()}
                className="plasmo-w-full plasmo-py-2.5 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 disabled:plasmo-opacity-40 disabled:plasmo-cursor-not-allowed plasmo-transition-colors">
                继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {showSendModal && showConfirmDialog && (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-bg-black/60 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-50 plasmo-p-4">
          <div className="plasmo-bg-[#3d4252] plasmo-rounded-2xl plasmo-w-full plasmo-max-w-sm plasmo-border plasmo-border-gray-600">
            {/* 标题栏 */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-5 plasmo-pt-5 plasmo-pb-4 plasmo-border-b plasmo-border-gray-600">
              <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
                <svg
                  className="plasmo-w-5 plasmo-h-5"
                  fill="none"
                  stroke="#f59e0b"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <h3 className="plasmo-text-base plasmo-font-semibold plasmo-text-gray-100">
                  确认交易
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="plasmo-p-1.5 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
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

            <div className="plasmo-px-5 plasmo-py-4 plasmo-space-y-3">
              {/* 交易信息 */}
              <div className="plasmo-bg-[#2d3142] plasmo-p-4 plasmo-rounded-xl plasmo-space-y-2">
                <div className="plasmo-flex plasmo-justify-between">
                  <span className="plasmo-text-xs plasmo-text-gray-500">
                    从
                  </span>
                  <span className="plasmo-text-xs plasmo-text-gray-300 plasmo-font-mono">
                    {currentAccount?.address.slice(0, 8)}...
                    {currentAccount?.address.slice(-4)}
                  </span>
                </div>
                <div className="plasmo-flex plasmo-justify-between">
                  <span className="plasmo-text-xs plasmo-text-gray-500">
                    到
                  </span>
                  <span className="plasmo-text-xs plasmo-text-gray-300 plasmo-font-mono">
                    {sendForm.to.slice(0, 8)}...{sendForm.to.slice(-4)}
                  </span>
                </div>
                <div className="plasmo-flex plasmo-justify-between">
                  <span className="plasmo-text-xs plasmo-text-gray-500">
                    金额
                  </span>
                  <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-200">
                    {sendForm.amount} ETH
                  </span>
                </div>
                <div className="plasmo-flex plasmo-justify-between">
                  <span className="plasmo-text-xs plasmo-text-gray-500">
                    手续费
                  </span>
                  <span className="plasmo-text-xs plasmo-text-gray-400">
                    {estimateGasFee()} ETH
                  </span>
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1.5">
                  确认密码
                </label>
                <input
                  type="password"
                  value={sendPassword}
                  onChange={(e) => setSendPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeTransaction()}
                  placeholder="输入钱包密码"
                  className="plasmo-w-full plasmo-bg-[#2d3142] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2.5 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="plasmo-flex plasmo-space-x-3 plasmo-px-5 plasmo-pb-5">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSending}
                className="plasmo-flex-1 plasmo-py-2.5 plasmo-bg-[#4d5262] plasmo-text-gray-300 plasmo-text-sm plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-[#5d6272] disabled:plasmo-opacity-50 plasmo-transition-colors">
                取消
              </button>
              <button
                onClick={executeTransaction}
                disabled={isSending || !sendPassword}
                className="plasmo-flex-1 plasmo-py-2.5 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-text-sm plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 disabled:plasmo-opacity-40 disabled:plasmo-cursor-not-allowed plasmo-transition-colors">
                {isSending ? "发送中..." : "确认发送"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`plasmo-fixed plasmo-bottom-4 plasmo-left-1/2 plasmo-z-[60] plasmo-w-[calc(100%-2rem)] plasmo-max-w-xs plasmo-rounded-xl plasmo-px-4 plasmo-py-3 plasmo-shadow-lg plasmo-transition-all plasmo-border ${
            toast.variant === "destructive"
              ? "plasmo-bg-red-900/90 plasmo-border-red-700 plasmo-text-red-100"
              : "plasmo-bg-[#3d4252] plasmo-border-[#c8f560]/30 plasmo-text-gray-100"
          }`}
          style={{ transform: "translateX(-50%)" }}>
          <p className="plasmo-text-sm plasmo-font-medium">{toast.title}</p>
          {toast.description && (
            <p className="plasmo-text-xs plasmo-mt-0.5 plasmo-opacity-80">
              {toast.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default MainDashboard
