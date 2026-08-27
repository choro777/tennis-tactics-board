let counter = 0

/** 盤面オブジェクト用の一意な id */
export function createId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}
