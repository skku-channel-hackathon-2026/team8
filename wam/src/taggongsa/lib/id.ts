export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`
}

export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/** 같은 key에는 항상 같은 항목을 고른다. */
export function hashPick<T>(items: T[], key: string): T {
  return items[hashString(key) % items.length]
}
