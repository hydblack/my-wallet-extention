/**
 * bip39 模块类型声明
 *
 * BIP39 是用于生成和验证助记词（Mnemonic）的标准，
 * 在钱包中用于创建 HD 钱包的种子短语。
 */
declare module 'bip39' {
  /**
   * 生成一个随机的 12 个单词助记词（128 位熵）
   *
   * @returns 空格分隔的英文助记词字符串
   */
  export function generateMnemonic(strength?: number): string;

  /**
   * 校验助记词是否合法
   *
   * @param mnemonic 待校验的助记词
   * @returns 合法返回 true，否则返回 false
   */
  export function validateMnemonic(mnemonic: string): boolean;

  /**
   * 将助记词异步转换为种子 Buffer（PBKDF2）
   *
   * @param mnemonic 助记词字符串
   * @param password 可选的 passphrase（BIP39 25th word）
   */
  export function mnemonicToSeed(
    mnemonic: string,
    password?: string
  ): Promise<Buffer>;

  /**
   * 将助记词同步转换为种子 Buffer（PBKDF2）
   *
   * @param mnemonic 助记词字符串
   * @param password 可选的 passphrase（BIP39 25th word）
   */
  export function mnemonicToSeedSync(
    mnemonic: string,
    password?: string
  ): Buffer;

  /**
   * 将助记词转换为熵（十六进制字符串）
   *
   * @param mnemonic 助记词字符串
   */
  export function mnemonicToEntropy(mnemonic: string): string;

  /**
   * 将熵转换为助记词
   *
   * @param entropy 熵（十六进制字符串）
   */
  export function entropyToMnemonic(entropy: string): string;
}
