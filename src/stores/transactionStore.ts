/**
 * 交易请求状态管理 Store
 *
 * 管理来自 DApp 的交易请求（pending queue）和交易历史记录（activity list）。
 * 使用 chrome.storage.local 跨 popup / background 上下文共享数据。
 * 监听 chrome.storage.onChanged 实时同步 background 写入的 pending 交易。
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import type { TransactionRecord, TransactionRequest } from "../types/transaction"
import { TX_STORE_KEY } from "../utils/constants"

interface TransactionStore {
  /** 待确认交易队列 */
  pendingTransactions: TransactionRecord[]
  /** 历史交易记录 */
  transactionHistory: TransactionRecord[]

  /** 添加待确认交易 */
  addPendingTx: (record: Omit<TransactionRecord, 'timestamp' | 'status'>) => void
  /** 确认交易 */
  confirmTx: (requestId: string, hash?: string) => void
  /** 拒绝交易 */
  rejectTx: (requestId: string) => void
  /** 标记交易失败 */
  failTx: (requestId: string, error: string) => void
  /** 获取当前需要确认的交易（队列头部） */
  getCurrentPending: () => TransactionRecord | undefined
  /** 清空历史记录 */
  clearHistory: () => void
  /** 从 storage 同步状态（background 写入后触发） */
  _syncFromStorage: (raw: string) => void
}

const chromeStorage = createJSONStorage(() => {
  return {
    getItem: (name: string): string | null => {
      const cached = localStorage.getItem(`_${name}_cache`)
      if (cached) return cached
      const local = localStorage.getItem(name)
      if (local) return local
      // popup 重新打开时 localStorage 是空的，需要从 chrome.storage.local 恢复
      // 但 getItem 是同步的，chrome.storage.local.get 是异步的
      // 返回 null 让 rehydrate 为空，由 onChanged 监听器 + 主动同步兜底
      return null
    },
    setItem: (name: string, value: string): void => {
      localStorage.setItem(name, value)
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [name]: value }).catch(() => {})
      }
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name)
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(name).catch(() => {})
      }
    }
  }
})

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      pendingTransactions: [],
      transactionHistory: [],

      addPendingTx: (record) => {
        const newRecord: TransactionRecord = {
          ...record,
          status: 'pending',
          timestamp: Date.now(),
        }
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, newRecord],
        }))
      },

      confirmTx: (requestId, hash) => {
        set((state) => {
          const tx = state.pendingTransactions.find(t => t.requestId === requestId)
          const confirmed = tx ? { ...tx, status: 'confirmed' as const, hash, timestamp: tx.timestamp } : null

          return {
            pendingTransactions: state.pendingTransactions.filter(t => t.requestId !== requestId),
            transactionHistory: confirmed
              ? [confirmed, ...state.transactionHistory]
              : state.transactionHistory,
          }
        })
      },

      rejectTx: (requestId) => {
        set((state) => {
          const tx = state.pendingTransactions.find(t => t.requestId === requestId)
          const rejected = tx ? { ...tx, status: 'rejected' as const } : null

          return {
            pendingTransactions: state.pendingTransactions.filter(t => t.requestId !== requestId),
            transactionHistory: rejected
              ? [rejected, ...state.transactionHistory]
              : state.transactionHistory,
          }
        })
      },

      failTx: (requestId, error) => {
        set((state) => {
          const tx = state.pendingTransactions.find(t => t.requestId === requestId)
          const failed = tx ? { ...tx, status: 'failed' as const, error } : null

          return {
            pendingTransactions: state.pendingTransactions.filter(t => t.requestId !== requestId),
            transactionHistory: failed
              ? [failed, ...state.transactionHistory]
              : state.transactionHistory,
          }
        })
      },

      getCurrentPending: () => {
        const { pendingTransactions } = get()
        return pendingTransactions[0]
      },

      clearHistory: () => {
        set({ transactionHistory: [] })
      },

      /**
       * 从 chrome.storage.local 原始数据同步状态
       * 当 background 写入 tx-store 时，popup 通过此方法更新 store
       */
      _syncFromStorage: (raw: string) => {
        try {
          const parsed = JSON.parse(raw)
          const state = parsed?.state
          if (!state) return

          const current = get()
          // 仅在 pendingTransactions 变化时更新（避免无限循环）
          const newPending = state.pendingTransactions || []
          const newHistory = state.transactionHistory || []

          const pendingChanged =
            newPending.length !== current.pendingTransactions.length ||
            newPending.some((t: TransactionRecord, i: number) =>
              !current.pendingTransactions[i] || current.pendingTransactions[i].requestId !== t.requestId
            )

          if (pendingChanged || newHistory.length !== current.transactionHistory.length) {
            set({
              pendingTransactions: newPending,
              transactionHistory: newHistory,
            })
          }
        } catch (e) {
          console.error('[transactionStore] syncFromStorage error:', e)
        }
      },
    }),
    {
      name: TX_STORE_KEY,
      storage: chromeStorage,
      partialize: (state) => ({
        pendingTransactions: state.pendingTransactions,
        transactionHistory: state.transactionHistory,
      }),
    }
  )
)

// ─── 监听 chrome.storage.onChanged，实时同步 background 写入 ───────────
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const change = changes[TX_STORE_KEY];
    if (!change?.newValue) return;

    // background 写入了新的 tx-store 数据，同步到 store
    const raw = typeof change.newValue === 'string'
      ? change.newValue
      : JSON.stringify(change.newValue);
    useTransactionStore.getState()._syncFromStorage(raw);
  });
}
