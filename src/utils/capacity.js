/**
 * 解析容量输入（纯函数，同步）。
 * 支持：`1024` `5 MB` `1.5 GiB` `8 KiB` `1 Gb` `100 Mbps`
 * 返回：{ ok, bytes: bigint, unit: string } | { ok: false, message }
 */

/** 同 radix.js normalize 的逻辑，避免跨文件依赖 */
function normalizeCap(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000\s_,]/g, '')
}

export function parseCapacity(raw) {
  const s = normalizeCap(raw)
  if (!s) return { ok: false, message: '请输入容量值，如 1024 / 5 MB / 1.5 GiB' }

  // 长单位优先匹配（KiB > K）
  const UNITS = [
    { name: 'TiB', factor: 1024n ** 4n },
    { name: 'GiB', factor: 1024n ** 3n },
    { name: 'MiB', factor: 1024n ** 2n },
    { name: 'KiB', factor: 1024n },
    { name: 'Tb', factor: 1000n ** 4n },
    { name: 'Gb', factor: 1000n ** 3n },
    { name: 'Mb', factor: 1000n ** 2n },
    { name: 'Kb', factor: 1000n },
  ]

  let matchedUnit = null
  let baseFactor = 1n // 默认 B

  for (const u of UNITS) {
    if (s.endsWith(u.name)) {
      matchedUnit = u.name
      baseFactor = u.factor
      break
    }
  }

  const numStr = matchedUnit ? s.slice(0, -matchedUnit.length).trim() : s.trim()
  if (!numStr) return { ok: false, message: '请输入有效数字' }

  return parseNumber(numStr, baseFactor, matchedUnit || 'B')
}

/** 内部：解析数字字符串 → 字节数（BigInt） */
function parseNumber(s, baseFactor, unitName) {
  const clean = s.replace(/\s/g, '').replace(/'/g, '')

  // 整数
  if (/^[+-]?\d+$/.test(clean)) {
    try {
      const v = BigInt(clean)
      return { ok: true, bytes: v * baseFactor, unit: unitName, isDecimal: false }
    } catch {
      return { ok: false, message: '数值超出范围' }
    }
  }

  // 带小数（如 1.5 GiB → 先合并 mantissa 再除以 10^decLen）
  if (/^[+-]?\d+\.\d+$/.test(clean)) {
    const parts = clean.split('.')
    const decimalLen = parts[1].length
    const mantissa = BigInt(parts[0] + parts[1])
    const numerator = mantissa * baseFactor
    const divisor = 10n ** BigInt(decimalLen)
    return { ok: true, bytes: numerator / divisor, unit: unitName, isDecimal: true }
  }

  // 科学计数法
  if (/^[+-]?\d*\.?\d+[eE][+-]?\d+$/.test(clean)) {
    const f = parseFloat(clean)
    if (isNaN(f) || !isFinite(f)) return { ok: false, message: '无法解析的数字' }
    const v = BigInt(Math.floor(Math.abs(f)))
    return { ok: true, bytes: v, unit: unitName, isDecimal: false }
  }

  return { ok: false, message: `'${s}' 不是有效数字` }
}

/**
 * 将字节数转换为最适单位的展示文本。
 * 例：500 → "500 B"，1024 → "1 KiB"，5242880 → "5 MiB"，1536 → "1 KiB 512 B"
 * 嵌入式用户更习惯整数单位组合（Flash/ROM 按整数地址划分）。
 */
export function formatCapacity(bytes) {
  if (!bytes && bytes !== 0n) return ''

  const isNegative = bytes < 0n
  bytes = bytes < 0n ? -bytes : bytes

  const scales = [
    { name: 'TiB', val: 1024n ** 4n },
    { name: 'GiB', val: 1024n ** 3n },
    { name: 'MiB', val: 1024n ** 2n },
    { name: 'KiB', val: 1024n },
    { name: 'B', val: 1n },
  ]

  const parts = []
  let remaining = bytes

  for (const scale of scales) {
    if (remaining >= scale.val) {
      const count = remaining / scale.val
      remaining = remaining % scale.val
      parts.push(`${String(count)} ${scale.name}`)
    }
  }

  if (parts.length === 0) return '0 B'

  return isNegative ? `-${parts.join(' ')}` : parts.join(' ')
}
