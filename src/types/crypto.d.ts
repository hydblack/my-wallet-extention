/**
 * crypto-js 模块类型声明
 *
 * crypto-js 提供常用加密算法的纯 JavaScript 实现，
 * 在钱包中用于 AES 加密私钥/助记词，以及 SHA256 哈希密码。
 */
declare module 'crypto-js' {
  /** CipherParams 对象，包含密文信息 */
  interface CipherParams {
    /** 将密文序列化为 Base64 字符串 */
    toString(encoder?: Encoder): string;
  }

  /** 编码器接口 */
  interface Encoder {
    stringify(wordArray: WordArray): string;
    parse(str: string): WordArray;
  }

  /** WordArray 表示一串 32 位整数，是 crypto-js 的基本数据单元 */
  interface WordArray {
    words: number[];
    sigBytes: number;
    toString(encoder?: Encoder): string;
  }

  // ─── AES ───────────────────────────────────────────────────────────────
  export const AES: {
    /**
     * AES 加密
     *
     * @param message 明文字符串
     * @param key     密钥字符串（或 WordArray）
     * @returns CipherParams 对象，调用 .toString() 得到 Base64 密文
     */
    encrypt(message: string, key: string | WordArray): CipherParams;

    /**
     * AES 解密
     *
     * @param ciphertext Base64 密文字符串（或 CipherParams）
     * @param key        密钥字符串（或 WordArray）
     * @returns WordArray，调用 .toString(enc.Utf8) 还原明文
     */
    decrypt(
      ciphertext: string | CipherParams,
      key: string | WordArray
    ): WordArray;
  };

  // ─── SHA256 ────────────────────────────────────────────────────────────
  /**
   * SHA256 哈希
   *
   * @param message 待哈希的字符串或 WordArray
   * @returns WordArray，调用 .toString() 得到十六进制字符串
   */
  export const SHA256: (message: string | WordArray) => WordArray;

  // ─── 编码器 ────────────────────────────────────────────────────────────
  export const enc: {
    /** UTF-8 编码器，用于将 WordArray 转换为字符串 */
    Utf8: Encoder;
    /** Base64 编码器 */
    Base64: Encoder;
    /** Hex 编码器 */
    Hex: Encoder;
    /** Latin1 编码器 */
    Latin1: Encoder;
  };
}
