/**
 * 账户相关类型
 *
 * 定义钱包账户的数据结构。
 */

/** 单个钱包账户信息 */
export interface WalletAccount {
  /** 以太坊地址 */
  address: string;
  /** 私钥（存储时为 AES 加密密文，内存中为明文） */
  privateKey: string;
  /** 用户自定义账户名称 */
  name: string;
  /** 账户在 HD 派生路径中的索引 */
  index: number;
  /** ETH 余额（格式化后的字符串，如 "1.234 ETH"） */
  ethBalance?: string;
}
