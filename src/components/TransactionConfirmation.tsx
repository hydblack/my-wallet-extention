import { ethers } from "ethers"
import React, { useEffect, useState } from "react"

import { useWalletStore } from "../stores/walletStore"

interface TransactionConfirmationProps {
  tx: {
    to?: string
    value?: string
    data?: string
    from?: string
    gasLimit?: string
    gasPrice?: string
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
  }
  origin?: string
  requestId: string
  onConfirm: (requestId: string, hash: string) => void
  onReject: (requestId: string, error: string) => void
  onGasEstimated?: (fee: string, limit: string) => void
}

export const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  tx,
  origin,
  requestId,
  onConfirm,
  onReject,
  onGasEstimated,
}) => {
  const [password, setPassword] = useState("")
  const [isConfirming, setIsConfirming] = useState(false)
  const [showFullData, setShowFullData] = useState(false)
  const [estimatedGasFee, setEstimatedGasFee] = useState<string | null>(null)
  const [estimatedGasLimit, setEstimatedGasLimit] = useState<string | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)

  const { currentAccount, currentNetwork, getProvider, isValidPassword } = useWalletStore()

  // 自动估算 Gas
  useEffect(() => {
    const estimateGas = async () => {
      const provider = getProvider()
      if (!provider || !tx.to) return

      setIsEstimating(true)
      try {
        // 获取网络费率
        const feeData = await provider.getFeeData()
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n

        // 构造估算参数
        const txForEstimate: any = { from: currentAccount?.address }
        if (tx.to) txForEstimate.to = tx.to
        if (tx.value) txForEstimate.value = tx.value
        if (tx.data) txForEstimate.data = tx.data

        // 估算 gas limit
        let gasLimit: bigint
        try {
          gasLimit = await provider.estimateGas(txForEstimate)
          gasLimit = (gasLimit * 120n) / 100n // 留 20% 余量
        } catch {
          gasLimit = 21000n
        }

        // 计算手续费
        const feeWei = gasLimit * gasPrice
        const feeEth = ethers.formatEther(feeWei)
        const formatted = `${parseFloat(parseFloat(feeEth).toFixed(8))} ${currentNetwork?.symbol || "ETH"}`

        setEstimatedGasFee(formatted)
        setEstimatedGasLimit(gasLimit.toString())
        onGasEstimated?.(formatted, gasLimit.toString())
      } catch (error) {
        console.error("Gas estimation error:", error)
        setEstimatedGasFee("估算失败")
      } finally {
        setIsEstimating(false)
      }
    }

    estimateGas()
  }, [tx, currentAccount, getProvider, currentNetwork, onGasEstimated])

  const formatAddress = (addr?: string) => {
    if (!addr) return "—"
    if (addr.length > 12) return `${addr.slice(0, 8)}...${addr.slice(-4)}`
    return addr
  }

  const formatValue = (value?: string) => {
    if (!value || value === "0x0" || value === "0") return "0"
    try {
      return ethers.formatEther(value)
    } catch {
      return "0"
    }
  }

  const hasData = tx.data && tx.data !== "0x" && tx.data !== "0x0"

  const handleConfirm = async () => {
    if (!password || !isValidPassword(password)) {
      return
    }

    setIsConfirming(true)
    try {
      // 通过 background 执行交易
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "TX_EXECUTE",
            data: { requestId, tx, password },
          },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          }
        )
      })

      if (response?.success) {
        onConfirm(requestId, response.data.hash)
      } else {
        onReject(requestId, response?.error || "交易执行失败")
      }
    } catch (error: any) {
      onReject(requestId, error?.message || "交易执行失败")
    } finally {
      setIsConfirming(false)
    }
  }

  const handleReject = () => {
    onReject(requestId, "用户拒绝了交易请求")
  }

  // 解析 calldata 前 4 字节（函数选择器）
  const functionSelector = hasData ? tx.data!.slice(0, 10) : null

  return (
    <div className="plasmo-h-full plasmo-bg-[#2d3142] plasmo-flex plasmo-flex-col">
      {/* 顶部栏 */}
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-py-3 plasmo-border-b plasmo-border-gray-700">
        <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
          <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="plasmo-text-base plasmo-font-semibold plasmo-text-gray-100">
            交易确认
          </span>
        </div>
        <button
          onClick={handleReject}
          disabled={isConfirming}
          className="plasmo-p-1.5 plasmo-text-gray-400 hover:plasmo-bg-gray-700 plasmo-rounded-lg plasmo-transition-colors">
          <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 来源信息 */}
      {origin && (
        <div className="plasmo-px-4 plasmo-py-2 plasmo-bg-[#3d4252]/50 plasmo-border-b plasmo-border-gray-700">
          <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
            <svg className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="plasmo-text-xs plasmo-text-gray-400 plasmo-truncate">{origin}</span>
          </div>
        </div>
      )}

      {/* 交易详情 */}
      <div className="plasmo-flex-1 plasmo-overflow-y-auto">
        <div className="plasmo-p-4 plasmo-space-y-3">
          {/* 交易信息卡片 */}
          <div className="plasmo-bg-[#3d4252] plasmo-p-4 plasmo-rounded-xl plasmo-space-y-3 plasmo-border plasmo-border-gray-600">
            {/* From */}
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
              <span className="plasmo-text-xs plasmo-text-gray-500">发送者</span>
              <span className="plasmo-text-xs plasmo-text-gray-300 plasmo-font-mono">
                {formatAddress(currentAccount?.address || tx.from)}
              </span>
            </div>

            {/* 箭头 */}
            <div className="plasmo-flex plasmo-justify-center">
              <svg className="plasmo-w-4 plasmo-h-4 plasmo-text-[#c8f560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* To */}
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
              <span className="plasmo-text-xs plasmo-text-gray-500">接收者</span>
              <span className="plasmo-text-xs plasmo-text-gray-300 plasmo-font-mono">
                {formatAddress(tx.to)}
              </span>
            </div>

            {/* Amount */}
            <div className="plasmo-border-t plasmo-border-gray-600 plasmo-pt-3">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
                <span className="plasmo-text-xs plasmo-text-gray-500">金额</span>
                <span className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-200">
                  {formatValue(tx.value)} {currentNetwork?.symbol || "ETH"}
                  {hasData && (
                    <span className="plasmo-text-xs plasmo-text-gray-500 plasmo-ml-1">
                      (合约交互)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Gas Fee */}
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
              <span className="plasmo-text-xs plasmo-text-gray-500">网络手续费</span>
              <span className="plasmo-text-xs plasmo-text-[#c8f560]">
                {isEstimating ? (
                  <span className="plasmo-flex plasmo-items-center plasmo-space-x-1">
                    <svg className="plasmo-w-3 plasmo-h-3 plasmo-animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>估算中</span>
                  </span>
                ) : (
                  estimatedGasFee || "—"
                )}
              </span>
            </div>

            {/* Gas Limit */}
            {estimatedGasLimit && (
              <div className="plasmo-text-right">
                <span className="plasmo-text-[10px] plasmo-text-gray-600">
                  Gas Limit: {estimatedGasLimit}
                </span>
              </div>
            )}
          </div>

          {/* Calldata */}
          {hasData && (
            <div className="plasmo-bg-[#3d4252] plasmo-p-3 plasmo-rounded-xl plasmo-border plasmo-border-gray-600">
              <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-2">
                <span className="plasmo-text-xs plasmo-text-gray-500">调用数据</span>
                {functionSelector && (
                  <span className="plasmo-text-[10px] plasmo-text-gray-600 plasmo-font-mono plasmo-bg-[#2d3142] plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded">
                    {functionSelector}
                  </span>
                )}
              </div>
              <pre className="plasmo-text-[11px] plasmo-text-gray-400 plasmo-font-mono plasmo-break-all plasmo-whitespace-pre-wrap plasmo-max-h-24 plasmo-overflow-y-auto plasmo-bg-[#2d3142] plasmo-p-2 plasmo-rounded-lg">
                {showFullData ? tx.data : `${tx.data!.slice(0, 66)}${tx.data!.length > 66 ? "..." : ""}`}
              </pre>
              {tx.data!.length > 66 && (
                <button
                  onClick={() => setShowFullData(!showFullData)}
                  className="plasmo-text-xs plasmo-text-[#c8f560] plasmo-mt-1 hover:plasmo-brightness-110">
                  {showFullData ? "收起" : "展开全部"}
                </button>
              )}
            </div>
          )}

          {/* 确认密码 */}
          <div>
            <label className="plasmo-block plasmo-text-xs plasmo-font-medium plasmo-text-gray-400 plasmo-mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="输入钱包密码以确认交易"
              className="plasmo-w-full plasmo-bg-[#3d4252] plasmo-border plasmo-border-gray-600 plasmo-rounded-lg plasmo-px-3 plasmo-py-2.5 plasmo-text-sm plasmo-text-gray-200 plasmo-placeholder-gray-600 focus:plasmo-outline-none focus:plasmo-border-[#c8f560] plasmo-transition-colors"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="plasmo-p-4 plasmo-border-t plasmo-border-gray-700 plasmo-bg-[#2d3142]">
        <div className="plasmo-flex plasmo-space-x-3">
          <button
            onClick={handleReject}
            disabled={isConfirming}
            className="plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-bg-red-900/60 plasmo-text-red-300 plasmo-text-sm plasmo-font-medium plasmo-rounded-xl hover:plasmo-bg-red-900/80 disabled:plasmo-opacity-50 plasmo-transition-colors plasmo-border plasmo-border-red-700/50">
            拒绝
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || !password}
            className="plasmo-flex-1 plasmo-py-3 plasmo-px-4 plasmo-bg-[#c8f560] plasmo-text-[#2d3142] plasmo-text-sm plasmo-font-semibold plasmo-rounded-xl hover:plasmo-brightness-110 disabled:plasmo-opacity-40 disabled:plasmo-cursor-not-allowed plasmo-transition-colors">
            {isConfirming ? (
              <span className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-space-x-1">
                <svg className="plasmo-w-4 plasmo-h-4 plasmo-animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>确认中...</span>
              </span>
            ) : (
              "确认"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
