/*
 * Vite introduction sample program
 * Copyright (c) 2024 Cybozu
 *
 * Licensed under the MIT License
 * https://opensource.org/license/mit/
 */

/*
 * NOTE: These functions are currently unused but kept as reference examples.
 * Remove this file if not needed, or import these functions in main.js to use them.
 */

/**
 * 自動採番の共通関数
 * @param {string} prefix - プレフィックス
 * @param {string} date - 日付
 * @param {string} uniqueid - ユニークID
 * @returns {string} 自動採番の文字列
 */
export const autoNum = (prefix, date, uniqueid) => {
  return prefix + '-' + date + '-' + uniqueid; // 自動採番の文字列を返す
};

/**
 * 文字数制限の共通関数
 * @param {string} text - チェック対象のテキスト
 * @param {number} min - 最小文字数
 * @param {number} max - 最大文字数
 * @returns {boolean} 文字数が範囲内かどうか
 */
export const charLimit = (text, min, max) => {
  const textNoSpace = text.replace(/\s+/g, ''); // 空白文字を削除
  const charCount = textNoSpace.length; // 文字数の取得
  return charCount >= min && charCount <= max; // 文字数がminとmaxの範囲内にあるかチェックした結果を返す
};
