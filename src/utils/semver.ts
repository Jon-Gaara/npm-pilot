/**
 * 判断从 current 升级到 latest 是否为 major 升级。
 * 语义：主版本号增大即为 major（如 4.x → 5.x）。
 * 任一版本号无法解析时返回 false。
 */
export function isMajorUpgrade(current: string, latest: string): boolean {
  const c = parseInt(current.split(".")[0], 10)
  const l = parseInt(latest.split(".")[0], 10)
  return !isNaN(c) && !isNaN(l) && l > c
}
