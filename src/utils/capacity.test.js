import { describe, expect, it } from 'vitest'
import { parseCapacity, formatCapacity } from './capacity.js'

describe('parseCapacity', () => {
  it('纯数字视为 Bytes', () => {
    expect(parseCapacity('1024')).toEqual({ ok: true, bytes: 1024n, unit: 'B', isDecimal: false })
  })

  it('带小数点的 Bytes', () => {
    const r = parseCapacity('1.5')
    expect(r.ok).toBe(true)
    expect(r.bytes).toBe(1n) // 向下取整
  })

  it('KiB / MiB / GiB / TiB', () => {
    const kiB = parseCapacity('1 KiB')
    expect(kiB.bytes).toBe(1024n)
    expect(kiB.unit).toBe('KiB')

    const miB = parseCapacity('5 MiB')
    expect(miB.bytes).toBe(5n * 1024n ** 2n)

    const giB = parseCapacity('1.5 GiB')
    expect(giB.bytes).toBe(1610612736n) // 1.5 * 1024^3

    const tiB = parseCapacity('1 TiB')
    expect(tiB.bytes).toBe(1024n ** 4n)
  })

  it('Kb / Mb / Gb / Tb（公制）', () => {
    const kb = parseCapacity('1 Kb')
    expect(kb.bytes).toBe(1000n)
    expect(kb.unit).toBe('Kb')

    const mb = parseCapacity('5 Mb')
    expect(mb.bytes).toBe(5n * 1000n ** 2n)

    const gb = parseCapacity('1 Gb')
    expect(gb.bytes).toBe(1000n ** 3n)

    const tb = parseCapacity('1 Tb')
    expect(tb.bytes).toBe(1000n ** 4n)
  })

  it('全角与空格容错', () => {
    const r = parseCapacity('１０２４')
    expect(r.bytes).toBe(1024n)
  })

  it('非法输入报错', () => {
    expect(parseCapacity('abc').ok).toBe(false)
    expect(parseCapacity('').ok).toBe(false)
  })

  it('只有前缀没有数字', () => {
    expect(parseCapacity('MiB').ok).toBe(false)
  })
})

describe('formatCapacity', () => {
  it('小于 1 KiB → B', () => {
    expect(formatCapacity(512n)).toBe('512 B')
    expect(formatCapacity(1023n)).toBe('1023 B')
  })

  it('恰好 1 KiB', () => {
    expect(formatCapacity(1024n)).toBe('1 KiB')
  })

  it('大数找最优单位', () => {
    expect(formatCapacity(1024n ** 2n)).toBe('1 MiB')
    expect(formatCapacity(1024n ** 3n)).toBe('1 GiB')
    expect(formatCapacity(1024n ** 4n)).toBe('1 TiB')
  })

  it('带余数的 KiB 拆为整数组合', () => {
    // 1536 = 1 KiB + 512 B（嵌入式更习惯整数单位组合）
    expect(formatCapacity(1536n)).toBe('1 KiB 512 B')
  })

  it('0 字节', () => {
    expect(formatCapacity(0n)).toBe('0 B')
  })

  it('多单位混合', () => {
    // 1 MiB + 1 KiB + 100 B
    const v = 1024n ** 2n + 1024n + 100n
    expect(formatCapacity(v)).toBe('1 MiB 1 KiB 100 B')
  })
})
