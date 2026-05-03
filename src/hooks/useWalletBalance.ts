import { ethers } from "ethers"
import { useCallback, useEffect, useRef, useState } from "react"

import { useWalletStore } from "../stores/walletStore"
import type { Token } from "../types"

/**
 * 格式化 ETH 余额
 * - 处理 0.0, 0.00 等情况，统一显示为 "0.0000 ETH"
 * - 保留最多 4 位小数
 * @param balance 原始余额字符串（如 "0", "1.23456789", "0.0"）
 * @returns 格式化后的字符串（如 "0.0000 ETH", "1.2345 ETH"）
 */
const formatEthBalance = (balance: string | undefined): string => {
  if (!balance || balance === "0" || balance === "0.0" || balance === "0.00") {
    return "0.0000 ETH"
  }
  // 保留最多 4 位小数，去除尾部多余的 0
  const num = parseFloat(balance)
  if (isNaN(num)) {
    return "0.0000 ETH"
  }
  // 使用正则保留最多 4 位小数
  const formatted = num.toFixed(4).replace(/\.?0+$/, "")
  return `${formatted} ETH`
}

export const useWalletBalance = () => {
  const currentAccount = useWalletStore((s) => s.currentAccount)
  const currentNetwork = useWalletStore((s) => s.currentNetwork)
  const getProvider = useWalletStore((s) => s.getProvider)
  const tokens = useWalletStore((s) => s.tokens)
  const updateTokenBalance = useWalletStore((s) => s.updateTokenBalance)
  const updateAccountBalance = useWalletStore((s) => s.updateAccountBalance)
  const [ethBalance, setEthBalance] = useState<string>("0.0000 ETH")
  const [isLoading, setIsLoading] = useState(false)

  // 使用 ref 追踪已标记的无效 token，避免重复报错
  const invalidTokensRef = useRef<Set<string>>(new Set())
  // 已完成余额查询的 token 地址集合，避免因 balance 字段变化导致重复请求
  const fetchedTokensRef = useRef<Set<string>>(new Set())
  // 追踪当前 token 地址列表，用于检测新增 token
  const prevTokenAddressesRef = useRef<Set<string>>(new Set())

  const fetchEthBalance = useCallback(async () => {
    if (!currentAccount || !currentNetwork) return

    setIsLoading(true)
    try {
      const provider = getProvider()
      if (!provider) return

      const balance = await provider.getBalance(currentAccount.address)
      console.log(`Fetched ETH balance for ${currentAccount.address} on ${currentNetwork.name}:`, balance.toString())
      const rawBalance = ethers.formatEther(balance)
      const formattedBalance = formatEthBalance(rawBalance)
      setEthBalance(formattedBalance)
      // 更新账户余额到 store
      updateAccountBalance(currentAccount.address, formattedBalance)
    } catch (error) {
      console.error("Failed to fetch ETH balance:", error)
      setEthBalance("0.0000 ETH")
      updateAccountBalance(currentAccount.address, "0.0000 ETH")
    } finally {
      setIsLoading(false)
    }
  }, [currentAccount, currentNetwork, getProvider, updateAccountBalance])

  const fetchTokenBalance = useCallback(async (token: Token) => {
    if (!currentAccount || !currentNetwork) return

    // 跳过已确认无效的 token
    if (invalidTokensRef.current.has(token.address)) return

    try {
      const provider = getProvider()
      if (!provider) return

      // 先验证合约是否存在：尝试调用 decimals() (code=0x06fdde03)
      // 如果合约不存在或非 ERC20，ethers 会 revert，我们在 catch 中处理
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ]

      const contract = new ethers.Contract(token.address, erc20Abi, provider)

      // 先尝试获取 decimals 来验证合约是否为有效的 ERC20
      let decimals = token.decimals
      try {
        decimals = await contract.decimals()
      } catch {
        console.warn(
          `Token ${token.symbol} (${token.address}) is not a valid ERC20 contract on ${currentNetwork.name}, skipping balance fetch`
        )
        invalidTokensRef.current.add(token.address)
        updateTokenBalance(token.address, "0")
        return
      }

      const balance = await contract.balanceOf(currentAccount.address)
      const formattedBalance = ethers.formatUnits(balance, decimals)
      updateTokenBalance(token.address, formattedBalance)
    } catch (error) {
      console.error(`Failed to fetch ${token.symbol} balance:`, error)
      // 设置余额为 0 而不是让错误持续循环
      invalidTokensRef.current.add(token.address)
      updateTokenBalance(token.address, "0")
    }
  }, [currentAccount, currentNetwork, getProvider, updateTokenBalance])

  const fetchAllTokenBalances = useCallback(async (tokenList: Token[]) => {
    if (!tokenList.length) return

    setIsLoading(true)
    try {
      await Promise.all(tokenList.map((token) => fetchTokenBalance(token)))
    } catch (error) {
      console.error("Failed to fetch token balances:", error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchTokenBalance])

  const refreshBalances = useCallback(async () => {
    await Promise.all([fetchEthBalance(), fetchAllTokenBalances(tokens)])
  }, [fetchEthBalance, fetchAllTokenBalances, tokens])

  // 账户或网络切换时：重置缓存，全量刷新余额
  useEffect(() => {
    if (!currentAccount) return
    invalidTokensRef.current.clear()
    fetchedTokensRef.current.clear()
    prevTokenAddressesRef.current.clear()
    fetchEthBalance()
    // 全量拉一次 token 余额，并记录已拉取的地址
    const currentTokens = useWalletStore.getState().tokens
    currentTokens.forEach((t) => prevTokenAddressesRef.current.add(t.address))
    fetchAllTokenBalances(currentTokens)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.address, currentNetwork?.id])

  // token 列表变化时：只对新增的 token 发起余额查询，避免循环
  useEffect(() => {
    const prevAddresses = prevTokenAddressesRef.current
    const newTokens = tokens.filter((t) => !prevAddresses.has(t.address))
    if (newTokens.length === 0) return

    // 更新已知地址集合
    tokens.forEach((t) => prevAddresses.add(t.address))

    // 只查新增的 token
    fetchAllTokenBalances(newTokens)
  // fetchAllTokenBalances 和 tokens 同步变化，用地址列表做 key 防循环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.map((t) => t.address).join(",")])

  return {
    ethBalance,
    isLoading,
    refreshBalances,
    fetchTokenBalance
  }
}
