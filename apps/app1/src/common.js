/*
 * Vite introduction sample program
 * Copyright (c) 2024 Cybozu
 *
 * Licensed under the MIT License
 * https://opensource.org/license/mit/
 */
/**
 * 自動採番の共通関数
 */
export const autoNum = (prefix, date, uniqueid) => {
  return prefix + '-' + date + '-' + uniqueid; // 自動採番の文字列を返す
};
/**
 * 文字数制限の共通関数
 */
export const charLimit = (text, min, max) => {
  const textNoSpace = text.replace(/\s+/g, ''); // 空白文字を削除
  const charCount = textNoSpace.length; // 文字数の取得
  return charCount >= min && charCount <= max; // 文字数がminとmaxの範囲内にあるかチェックした結果を返す
};
