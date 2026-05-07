/**
 * 交易类型检测工具
 * 
 * 根据函数选择器（calldata 前 4 字节）识别交易类型
 */

// 常见的 ERC-20 / DeFi 函数选择器
const FUNCTION_SELECTORS: Record<string, string> = {
  // ERC-20 标准函数
  'a9059cbb': 'Transfer',      // transfer(address,uint256)
  '23b872dd': 'Transfer',      // transferFrom(address,address,uint256)
  '095ea7b3': 'Approval',     // approve(address,uint256)
  '70a08231': 'BalanceOf',    // balanceOf(address)
  'dd62ed3e': 'Allowance',    // allowance(address,address)
  '60c7dacb': 'Mint',        // mint(address,uint256)
  '42966c68': 'Burn',         // burn(uint256)
  
  // Uniswap V2 / PancakeSwap 等 DEX
  '38ed1739': 'Swap',         // swapExactTokensForTokens
  '5aa615b2': 'Swap',         // swapTokensForExactTokens
  'ea8a4b6e': 'Swap',        // swapExactETHForTokens
  '4a25d9f7': 'Swap',        // swapTokensForExactETH
  '18cbafe5': 'Swap',        // swapExactTokensForTokensSupportingFeeOnTransferTokens
  'b6f9de95': 'Swap',        // swapExactTokensForETHSupportingFeeOnTransferTokens
  'fb3bdb41': 'Swap',        // swapETHForExactTokens
  
  // Uniswap V3
  '5ae401dc': 'Swap',         // exactInputSingle
  '09b81346': 'Swap',        // exactInput
  'fa461e33': 'Swap',        // exactOutputSingle
  'b858183f': 'Swap',        // exactOutput
  
  // 其他常见 DeFi
  '2e1a7d4d': 'Withdraw',   // withdraw(uint256)
  'd0e30db0': 'Deposit',     // deposit()
  'a9059cbb': 'Transfer',    // 重复但保留
}

export type TransactionType = 'Transfer' | 'Approval' | 'Swap' | 'Contract' | 'Unknown'

/**
 * 检测交易类型
 * @param tx 交易请求对象
 * @returns 交易类型字符串
 */
export function detectTransactionType(tx: { to?: string; value?: string; data?: string }): TransactionType {
  // 无 data → ETH 转账
  if (!tx.data || tx.data === '0x' || tx.data === '0x0') {
    if (tx.value && tx.value !== '0x0' && tx.value !== '0') {
      return 'Transfer'
    }
    return 'Unknown'
  }

  // 提取函数选择器（calldata 前 4 字节 = 8 个十六进制字符，加上 '0x' 共 10 个字符）
  const selector = tx.data.slice(2, 10).toLowerCase()
  
  if (FUNCTION_SELECTORS[selector]) {
    return FUNCTION_SELECTORS[selector] as TransactionType
  }

  // 未知合约交互
  return 'Contract'
}

/**
 * 获取交易类型对应的颜色类名
 */
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case 'Transfer':
      return 'plasmo-text-[#c8f560]'
    case 'Approval':
      return 'plasmo-text-yellow-400'
    case 'Swap':
      return 'plasmo-text-blue-400'
    case 'Contract':
      return 'plasmo-text-gray-400'
    default:
      return 'plasmo-text-gray-500'
  }
}

/**
 * 获取交易类型对应的背景色类名
 */
export function getTransactionTypeBgColor(type: TransactionType): string {
  switch (type) {
    case 'Transfer':
      return 'plasmo-bg-[#c8f560]/10 plasmo-border-[#c8f560]/20'
    case 'Approval':
      return 'plasmo-bg-yellow-400/10 plasmo-border-yellow-400/20'
    case 'Swap':
      return 'plasmo-bg-blue-400/10 plasmo-border-blue-400/20'
    case 'Contract':
      return 'plasmo-bg-gray-400/10 plasmo-border-gray-400/20'
    default:
      return 'plasmo-bg-gray-500/10 plasmo-border-gray-500/20'
  }
}
