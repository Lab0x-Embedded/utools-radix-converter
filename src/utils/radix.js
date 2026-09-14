/**
 * 进制转换核心（纯函数，无 Vue / DOM 依赖）
 *
 * 仅支持 2 / 8 / 10 / 16 四种进制；数值运算一律使用 BigInt。
 *
 * 关于 uTools 匹配指令（regex / over）传入的 payload：官方文档只给出字段名，
 * 实测为「匹配到的原始字符串」（保留大小写、下划线、空格）。
 * 此处不假设形态，由调用方（Convert/index.vue）做 String() 归一化。
 */

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const PREFIX_OF = { 2: '0b', 8: '0o', 16: '0x' } // 十进制无前缀
const GROUP_SIZE = { 2: 4, 8: 3, 16: 2 } // 十进制不分组

/** 全角→半角，并去掉所有分隔符（空格/下划线/逗号） */
export function normalize(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000\s_,]/g, '')
}

function digitValue(ch) {
  return DIGITS.indexOf(ch.toLowerCase())
}

/**
 * 解析用户输入。
 * @param {string} raw 原始输入
 * @param {2|8|10|16} [forcedRadix] 手动指定的进制（此时允许不带前缀）
 * @returns {{ok: true, value: bigint, negative: boolean, radix: number}|{ok: false, message: string}}
 */
export function parseInput(raw, forcedRadix) {
  const s = normalize(raw)
  if (!s) return { ok: false, message: '请输入一个数值' }

  let body = s
  let negative = false
  const sign = /^([+-])/.exec(body)
  if (sign) {
    negative = sign[1] === '-'
    body = body.slice(1)
  }
  if (!body) return { ok: false, message: '请输入一个数值' }

  let radix = forcedRadix || 0
  let digits = body

  const prefixed = /^0([xXbBoO])(.*)$/.exec(body)
  if (prefixed) {
    const p = prefixed[1].toLowerCase()
    const prefixRadix = p === 'x' ? 16 : p === 'b' ? 2 : 8
    if (radix && radix !== prefixRadix) {
      return { ok: false, message: `前缀 0${p} 与所选进制（${radix}）不一致` }
    }
    radix = prefixRadix
    digits = prefixed[2]
  }
  if (!radix) radix = 10
  if (!digits) {
    const prefix = radix === 16 ? '0x' : radix === 2 ? '0b' : radix === 8 ? '0o' : ''
    return { ok: false, message: `${prefix} 后面没有数字` }
  }

  const bad = [...digits].find((ch) => {
    const v = digitValue(ch)
    return v < 0 || v >= radix
  })
  if (bad) return { ok: false, message: `「${bad}」不是合法的 ${radix} 进制数字` }

  let value
  try {
    value = BigInt((PREFIX_OF[radix] || '') + digits.toLowerCase())
  } catch {
    return { ok: false, message: '数值格式有误' }
  }
  return { ok: true, value: negative ? -value : value, negative, radix }
}

/** 界面展示顺序 */
export const RADIX_ROWS = [
  { radix: 16, label: 'HEX', name: '十六进制' },
  { radix: 10, label: 'DEC', name: '十进制' },
  { radix: 2, label: 'BIN', name: '二进制' },
  { radix: 8, label: 'OCT', name: '八进制' },
]

function groupDigits(s, radix) {
  const size = GROUP_SIZE[radix]
  if (!size) return s
  const parts = []
  for (let end = s.length; end > 0; end -= size) {
    parts.unshift(s.slice(Math.max(0, end - size), end))
  }
  return parts.join(' ')
}

/**
 * 格式化数值。
 * group=true 仅用于界面显示；复制到剪贴板必须用 group=false（带空格粘进代码会坏）。
 */
export function format(value, radix, { group = false, padWidth = 0, uppercase = false } = {}) {
  const negative = value < 0n
  let s = (negative ? -value : value).toString(radix)
  if (padWidth > s.length) s = s.padStart(padWidth, '0')
  if (uppercase) s = s.toUpperCase()
  if (group) s = groupDigits(s, radix)
  return negative ? '-' + s : s
}

/**
 * 一次算出四行结果。
 * @returns {{ok: true, value: bigint, radix: number, rows: Array}|{ok: false, message: string}}
 */
export function convertAll(raw, forcedRadix) {
  const parsed = parseInput(raw, forcedRadix)
  if (!parsed.ok) return parsed
  const { value, radix } = parsed
  const rows = RADIX_ROWS.map((r) => ({
    radix: r.radix,
    label: r.label,
    name: r.name,
    isSource: r.radix === radix,
    display: format(value, r.radix, { group: true }),
    raw: format(value, r.radix, { group: false }),
  }))
  return { ok: true, value, radix, rows }
}

export const WIDTHS = [8, 16, 32, 64]

/**
 * 按位宽解释数值（寄存器场景核心）。
 *
 * 关键：BigInt.asUintN / asIntN 才是补码语义，
 * (-1n).toString(2) 得到的是 "-1" 而不是全 1。
 */
export function interpret(value, width) {
  const unsigned = BigInt.asUintN(width, value)
  const signed = BigInt.asIntN(width, value)
  return {
    width,
    unsigned: unsigned.toString(10),
    signed: signed.toString(10),
    hex: format(unsigned, 16, { padWidth: width / 4, group: true, uppercase: true }),
    bin: format(unsigned, 2, { padWidth: width, group: true }),
    signBitSet: signed < 0n,
  }
}

/** 大端字节数组（hex 字符串，小写补零） */
function bytesOf(value, width) {
  const unsigned = BigInt.asUintN(width, value)
  const bytes = []
  for (let i = width / 8 - 1; i >= 0; i--) {
    bytes.push(((unsigned >> BigInt(i * 8)) & 0xffn).toString(16).padStart(2, '0'))
  }
  return bytes
}

/** 字节序视图 */
export function byteOrder(value, width) {
  const big = bytesOf(value, width)
  return { bigEndian: big.join(' '), littleEndian: [...big].reverse().join(' ') }
}
