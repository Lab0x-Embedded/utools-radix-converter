# uTools 进制转换插件 v1 实施计划

> **给执行者**：按 Task 顺序逐任务实施，每个 Task 一个 commit。核心算法必须先写测试（TDD），UI 部分以手工验收为准。

**Goal：** 做一个自己天天用的 uTools 进制转换插件 —— 覆盖"看代码里的常量、寄存器位操作、字节序"三类高频场景，纯前端计算，零依赖外部服务。

**Architecture：**
- 全部转换逻辑是无副作用纯函数，集中在 `src/utils/radix.js`，与 Vue 完全解耦，用 Vitest 单测。
- UI 只有一个页面（`src/Convert/index.vue`）：顶部输入框 → 四行（HEX/DEC/BIN/OCT）实时联动 → 下部"解释视图"（位宽×有符号 + 字节序）。
- 匹配指令（`0x`/`0b`/`0o`）与功能指令进入同一个组件，靠 `enterAction.payload` 预填输入框。
- **不使用 preload**：纯前端即可完成，少一层审核约束。

**Tech Stack：** Vue 3.5 + Vite 6（`base: './'` 已配）+ Vitest（新增，devDep）+ uTools 7.8.0。无 preload、无运行时依赖。

**Spec：** `.hermes/plans/2026-09-14_200527-utools-进制转换插件设计分析.md`

---

## 全局约束（每个 Task 都隐含遵守）

1. 只支持 **2 / 8 / 10 / 16** 四种进制，不追求任意进制。
2. 所有数值运算走 **BigInt**，禁止 `Number` / `parseInt` 处理值本身（`parseInt` 只允许用来做逐字符合法性判断）。
3. 位宽/补码一律用 `BigInt.asUintN` / `BigInt.asIntN`，不手写补码。
4. 算法只能出现在 `src/utils/radix.js`；`.vue` 文件里不写转换逻辑。
5. **复制到剪贴板的内容不带分组分隔符**（带空格粘进代码会坏）；显示可以带。
6. 不写死背景色/前景色，用 `src/main.css` 里的 CSS 变量 + `prefers-color-scheme`。
7. 界面文案中文；十六进制显示默认**小写**。
8. 插件内反馈用自绘轻提示，**不用 `utools.showNotification`**（系统通知太吵）。
9. 不往同步 DB 写高频数据；v1 不写历史记录。
10. `plugin.json` 里正则的 `\` 必须写成 `\\`；不使用会被忽略的任意匹配正则。

---

## 范围决策（已确认）

| 项 | 决定 |
|---|---|
| 位宽 × 有符号/无符号 | **进 v1** |
| 字节序（大端/小端） | **进 v1** |
| 模板示例 hello/read/write | **全部删除**（含 `public/preload/`） |
| IEEE754 / 位图 / 收藏历史 | v1.5，本计划不实现 |
| 十进制裸数字的 regex 匹配 | 不做（会污染搜索面板） |
| `mainPush` 零切换 | 排在 P5（可选，见文末），v1 先不做 |
| 图标 | 先沿用模板 `public/logo.png` |

---

## 文件结构

**Create：**
- `src/utils/radix.js` — 纯函数核心（归一化/解析/格式化/位宽解释/字节序）
- `src/utils/radix.test.js` — Vitest 单测
- `src/Convert/index.vue` — 主界面
- `src/Convert/ResultRow.vue` — 单行结果（复制/粘贴）
- `src/Convert/InterpretView.vue` — 位宽/有符号 + 字节序视图
- `README.md` — 中文说明

**Modify：**
- `public/plugin.json` — 换成 4 条新指令，删掉 `preload` 字段
- `src/App.vue` — 只保留 Convert 入口
- `src/main.css` — 增加 CSS 变量
- `package.json` — 加 vitest devDep + `test` 脚本

**Delete：**
- `src/Hello/index.vue`、`src/Read/index.vue`、`src/Write/index.vue`
- `public/preload/services.js`、`public/preload/package.json`

---

## Task 1：接入 Vitest

**Files：** Modify `package.json`

- [ ] **Step 1：安装**

```bash
cd "/Users/ryanuo/dev/github/进制转化工具"
npm i -D vitest
```

- [ ] **Step 2：加脚本**（`package.json` 的 `scripts`）

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3：写一个会失败的冒烟测试** `src/utils/radix.test.js`

```js
import { describe, it, expect } from 'vitest'
import { normalize } from './radix.js'

describe('normalize', () => {
  it('去掉空格/下划线/逗号', () => {
    expect(normalize('0x1F 2A_3,4')).toBe('0x1F2A34')
  })
})
```

- [ ] **Step 4：运行，应当失败**

```bash
npm test
```
Expected：FAIL — 找不到 `./radix.js` / `normalize` 未导出。

- [ ] **Step 5：Commit**

```bash
git add package.json package-lock.json src/utils/radix.test.js
git commit -m "test: 接入 Vitest + normalize 冒烟测试"
```

---

## Task 2：`normalize` / `parseInput`（TDD）

**Files：** Create `src/utils/radix.js`；Modify `src/utils/radix.test.js`

**Interfaces（后续任务依赖以下签名）：**
```js
normalize(raw: string): string
parseInput(raw: string, forcedRadix?: 2|8|10|16): { ok: true, value: bigint, negative: boolean, radix: number }
                                                    | { ok: false, message: string }
```

- [ ] **Step 1：先写测试**（追加到 `radix.test.js`）

```js
import { parseInput } from './radix.js'

describe('parseInput', () => {
  it('识别十六进制前缀', () => {
    const r = parseInput('0x7FFFFFFF')
    expect(r.ok).toBe(true)
    expect(r.radix).toBe(16)
    expect(r.value).toBe(2147483647n)
  })

  it('识别二进制/八进制前缀', () => {
    expect(parseInput('0b1010_1010').value).toBe(170n)
    expect(parseInput('0o777').value).toBe(511n)
  })

  it('无前缀按十进制', () => {
    expect(parseInput('123').value).toBe(123n)
    expect(parseInput('123').radix).toBe(10)
  })

  it('支持负数与正号', () => {
    expect(parseInput('-42').value).toBe(-42n)
    expect(parseInput('+42').value).toBe(42n)
    expect(parseInput('-0x10').value).toBe(-16n)
  })

  it('全角字符等价于半角', () => {
    expect(parseInput('０ｘ１Ｆ').value).toBe(31n)
  })

  it('带分隔符', () => {
    expect(parseInput('0x12 34_56').value).toBe(0x123456n)
  })

  it('大数不丢精度', () => {
    expect(parseInput('0xFFFFFFFFFFFFFFFF').value).toBe(18446744073709551615n)
    expect(parseInput('0xFFFFFFFFFFFFFFFFF').value).toBe(295147905179352825855n)
  })

  it('forcedRadix 允许无前缀输入', () => {
    const r = parseInput('FF', 16)
    expect(r.value).toBe(255n)
    expect(r.radix).toBe(16)
  })

  it('前缀与 forcedRadix 冲突时报错', () => {
    const r = parseInput('0x10', 10)
    expect(r.ok).toBe(false)
    expect(r.message).toContain('不一致')
  })

  it('非法字符报错而不抛异常', () => {
    expect(parseInput('0xZZ').ok).toBe(false)
    expect(parseInput('0xZZ').message).toContain('Z')
    expect(parseInput('hello').ok).toBe(false)
    expect(parseInput('').ok).toBe(false)
    expect(parseInput('   ').ok).toBe(false)
  })

  it('只有前缀没有数字时报错', () => {
    expect(parseInput('0x').ok).toBe(false)
  })
})
```

- [ ] **Step 2：运行确认失败**

```bash
npm test
```
Expected：FAIL — `parseInput` 未导出。

- [ ] **Step 3：实现**（`src/utils/radix.js`）

```js
/**
 * 进制转换核心（纯函数，无 Vue / DOM 依赖）
 * 仅支持 2 / 8 / 10 / 16；数值运算一律使用 BigInt。
 */

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const PREFIX_OF = { 2: '0b', 8: '0o', 16: '0x' } // 十进制无前缀
const GROUP_SIZE = { 2: 4, 8: 3, 16: 2 }         // 十进制不分组

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
  if (!digits) return { ok: false, message: `0${radix === 16 ? 'x' : radix === 2 ? 'b' : 'o'} 后面没有数字` }

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
```

- [ ] **Step 4：运行确认通过**

```bash
npm test
```
Expected：PASS（normalize + parseInput 全部用例）

- [ ] **Step 5：Commit**

```bash
git add src/utils/radix.js src/utils/radix.test.js
git commit -m "feat(radix): normalize + parseInput（全角/分隔符/负数/大数容错）"
```

---

## Task 3：`format` / `convertAll`（TDD）

**Files：** Modify `src/utils/radix.js`、`src/utils/radix.test.js`

**Interfaces：**
```js
format(value: bigint, radix: 2|8|10|16, opts?: { group?: boolean, padWidth?: number, uppercase?: boolean }): string
convertAll(raw: string, forcedRadix?: 2|8|10|16):
  { ok: true, value: bigint, radix: number, rows: { radix, label, name, isSource, display, raw }[] }
  | { ok: false, message: string }
RADIX_ROWS: { radix, label, name }[]
```

- [ ] **Step 1：先写测试**

```js
import { format, convertAll } from './radix.js'

describe('format', () => {
  it('二进制按 4 位分组', () => {
    expect(format(0b10101010n, 2, { group: true })).toBe('1010 1010')
  })
  it('十六进制按 2 位分组', () => {
    expect(format(0x12345678n, 16, { group: true })).toBe('12 34 56 78')
  })
  it('可按位宽补零', () => {
    expect(format(0x0Fn, 2, { padWidth: 16, group: true })).toBe('0000 0000 0000 1111')
    expect(format(0x0Fn, 16, { padWidth: 4, uppercase: true })).toBe('000F')
  })
  it('十进制不分组', () => {
    expect(format(4294967295n, 10, { group: true })).toBe('4294967295')
  })
  it('负数带符号位', () => {
    expect(format(-16n, 16)).toBe('-10')
    expect(format(-170n, 2, { group: true })).toBe('-1010 1010')
  })
})

describe('convertAll', () => {
  it('一次给出四种进制', () => {
    const r = convertAll('0x7FFFFFFF')
    expect(r.ok).toBe(true)
    expect(r.radix).toBe(16)
    expect(r.rows.map((x) => x.radix)).toEqual([16, 10, 2, 8])
    expect(r.rows[1].raw).toBe('2147483647')
    expect(r.rows[3].raw).toBe('17777777777')
  })
  it('显示值带分隔符、复制值不带', () => {
    const r = convertAll('0b1010')
    const bin = r.rows.find((x) => x.radix === 2)
    expect(bin.display).toBe('1010')
    const r2 = convertAll('0xAA')
    const bin2 = r2.rows.find((x) => x.radix === 2)
    expect(bin2.display).toBe('1010 1010')
    expect(bin2.raw).toBe('10101010')
  })
  it('源进制行被标记', () => {
    expect(convertAll('0xFF').rows.find((x) => x.isSource).radix).toBe(16)
    expect(convertAll('255').rows.find((x) => x.isSource).radix).toBe(10)
  })
  it('非法输入原样返回失败', () => {
    expect(convertAll('abc').ok).toBe(false)
  })
})
```

- [ ] **Step 2：运行确认失败** → `npm test`，Expected：FAIL

- [ ] **Step 3：实现**（追加到 `src/utils/radix.js`）

```js
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
 * group=true 用于界面显示；复制到剪贴板时务必用 group=false。
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
 * @returns {{ok:true,value:bigint,radix:number,rows:Array}|{ok:false,message:string}}
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
```

- [ ] **Step 4：运行确认通过** → `npm test`，Expected：PASS

- [ ] **Step 5：Commit**

```bash
git add src/utils/radix.js src/utils/radix.test.js
git commit -m "feat(radix): format + convertAll 四进制联动结果"
```

---

## Task 4：`interpret`（位宽×有符号）+ `byteOrder`（TDD）

**Files：** Modify `src/utils/radix.js`、`src/utils/radix.test.js`

**Interfaces：**
```js
WIDTHS: number[]                       // [8,16,32,64]
interpret(value: bigint, width: 8|16|32|64):
  { width, unsigned: string, signed: string, hex: string, bin: string, signBitSet: boolean }
byteOrder(value: bigint, width: 8|16|32|64): { bigEndian: string, littleEndian: string }
```

- [ ] **Step 1：先写测试**

```js
import { interpret, byteOrder, WIDTHS } from './radix.js'

describe('interpret', () => {
  it('0xFFFFFFFF 在 32 位下：无符号 4294967295 / 有符号 -1', () => {
    const r = interpret(0xFFFFFFFFn, 32)
    expect(r.unsigned).toBe('4294967295')
    expect(r.signed).toBe('-1')
    expect(r.signBitSet).toBe(true)
  })
  it('0x7FFFFFFF 在 32 位下符号位为 0', () => {
    const r = interpret(0x7FFFFFFFn, 32)
    expect(r.unsigned).toBe('2147483647')
    expect(r.signed).toBe('2147483647')
    expect(r.signBitSet).toBe(false)
  })
  it('负数输入先按宽度取补码', () => {
    const r = interpret(-1n, 16)
    expect(r.unsigned).toBe('65535')
    expect(r.hex).toBe('FF FF') // 十六进制按字节（2 位）分组
    expect(r.bin).toBe('1111 1111 1111 1111')
  })
  it('超宽数值按宽度截断', () => {
    expect(interpret(0x1FFn, 8).unsigned).toBe('255')
  })
  it('二进制按位宽补零', () => {
    expect(interpret(0x0Fn, 16).bin).toBe('0000 0000 0000 1111')
  })
  it('WIDTHS 覆盖 8/16/32/64', () => {
    expect(WIDTHS).toEqual([8, 16, 32, 64])
  })
})

describe('byteOrder', () => {
  it('0x12345678 → 大端 12 34 56 78 / 小端 78 56 34 12', () => {
    const r = byteOrder(0x12345678n, 32)
    expect(r.bigEndian).toBe('12 34 56 78')
    expect(r.littleEndian).toBe('78 56 34 12')
  })
  it('16 位补零到 2 字节', () => {
    expect(byteOrder(0x0Fn, 16).bigEndian).toBe('00 0f')
  })
  it('64 位', () => {
    expect(byteOrder(0x0102030405060708n, 64).littleEndian).toBe('08 07 06 05 04 03 02 01')
  })
  it('负数按补码取字节', () => {
    expect(byteOrder(-1n, 32).bigEndian).toBe('ff ff ff ff')
  })
})
```

- [ ] **Step 2：运行确认失败** → `npm test`，Expected：FAIL

- [ ] **Step 3：实现**（追加到 `src/utils/radix.js`）

```js
export const WIDTHS = [8, 16, 32, 64]

/**
 * 按位宽解释数值（寄存器场景核心）。
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
```

- [ ] **Step 4：运行确认通过** → `npm test`，Expected：PASS（全绿）

- [ ] **Step 5：Commit**

```bash
git add src/utils/radix.js src/utils/radix.test.js
git commit -m "feat(radix): 位宽/有符号解释 + 字节序视图"
```

---

## Task 5：清掉模板示例 + 改造 plugin.json + App.vue 收敛

**Files：** Delete 示例文件；Modify `public/plugin.json`、`src/App.vue`

- [ ] **Step 1：删除模板示例与 preload**

```bash
cd "/Users/ryanuo/dev/github/进制转化工具"
git rm -r src/Hello src/Read src/Write public/preload
rm -rf src/Hello src/Read src/Write public/preload
```

- [ ] **Step 2：改 `public/plugin.json`**（完整替换）

```json
{
  "main": "index.html",
  "logo": "logo.png",
  "pluginSetting": {
    "single": true,
    "height": 420
  },
  "features": [
    {
      "code": "convert",
      "explain": "进制转换（2/8/10/16 互转、位宽、字节序）",
      "cmds": [
        "进制转换",
        "进制",
        "radix",
        "base"
      ]
    },
    {
      "code": "hex",
      "explain": "十六进制 → 十进制/二进制/八进制",
      "cmds": [
        {
          "type": "regex",
          "label": "十六进制转换",
          "match": "/^0[xX][0-9a-fA-F][0-9a-fA-F_\\s]*$/",
          "minLength": 3,
          "maxLength": 200
        }
      ]
    },
    {
      "code": "bin",
      "explain": "二进制 → 十进制/十六进制/八进制",
      "cmds": [
        {
          "type": "regex",
          "label": "二进制转换",
          "match": "/^0[bB][01][01_\\s]*$/",
          "minLength": 3,
          "maxLength": 200
        }
      ]
    },
    {
      "code": "oct",
      "explain": "八进制 → 十进制/十六进制/二进制",
      "cmds": [
        {
          "type": "regex",
          "label": "八进制转换",
          "match": "/^0[oO][0-7][0-7_\\s]*$/",
          "minLength": 3,
          "maxLength": 200
        }
      ]
    }
  ]
}
```

- [ ] **Step 3：改 `src/App.vue`**（完整替换）

```vue
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import Convert from './Convert/index.vue'

const route = ref('')
const enterAction = ref({})

onMounted(() => {
  window.utools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
  })
  window.utools.onPluginOut(() => {
    route.value = ''
  })
})
</script>

<template>
  <Convert v-if="route" :enter-action="enterAction" />
</template>
```

- [ ] **Step 4：临时占位组件**（让本任务可独立验证 `src/Convert/index.vue`）

```vue
<script setup>
import { ref } from 'vue'

const props = defineProps({ enterAction: { type: Object, required: true } })
const raw = ref(JSON.stringify(props.enterAction))
</script>

<template>
  <pre style="padding: 20px">{{ raw }}</pre>
</template>
```

- [ ] **Step 5：验证**

```bash
npm run dev
```
uTools 开发者工具「接入开发」→ 进入插件：
- 搜索面板只剩「进制转换」及三条匹配指令（不再有"你好/读文件"）
- 进入插件能看到进入参数 JSON（确认 `payload` 形态，见 Task 6 Step 1）
Expected：无报错、无白屏

- [ ] **Step 6：Commit**

```bash
git add -A
git commit -m "chore: 移除模板示例与 preload，改造 plugin.json 为进制转换指令"
```

---

## Task 6：探测 `payload` 形态（一次性，必须实测）

**为什么：** 官方文档只给出 `PluginEnterAction` 的字段名，不同类型的 `payload` 具体形态（字符串？是否含前缀？大小写？）必须以实测为准 —— 这一步是纯观察，不写正式逻辑。

- [ ] **Step 1：在占位组件里打印**

进入插件后打开 devtools（`Ctrl/Cmd + Shift + I`），依次触发：

| 触发方式 | 观察点 |
|---|---|
| 主搜索框输入 `0xff` 选「十六进制转换」 | `type` / `payload` 是什么 |
| 主搜索框输入 `0b1010` 选「二进制转换」 | 同上 |
| 选择文本后按热键带入，再选指令 | payload 是否保留原始大小写 |

- [ ] **Step 2：把实测结论写进 `radix.js` 顶部的注释**（例：`// 实测：type='regex'，payload 为匹配到的原始字符串（保留大小写与下划线）`）

- [ ] **Step 3：Commit**

```bash
git add -A
git commit -m "docs: 记录 uTools 匹配指令 payload 实测形态"
```

---

## Task 7：主界面 `Convert/index.vue` + `ResultRow.vue`

**Files：** Create `src/Convert/ResultRow.vue`、`src/Convert/index.vue`（覆盖占位版本）；Modify `src/main.css`

**Interfaces：**
```
ResultRow props: { label, name, display, raw, isSource, active }
ResultRow emits: ['copy', 'paste']   // copy(raw, name) / paste(raw, name)
```

- [ ] **Step 1：`src/main.css` 追加变量**（保留原有内容，只追加）

```css
:root {
  --rdx-fg: #1f2328;
  --rdx-muted: #8a8f98;
  --rdx-border: #d9d9d9;
  --rdx-accent: #409eff;
  --rdx-surface: #ffffff;
  --rdx-surface-alt: #f7f8fa;
}

@media (prefers-color-scheme: dark) {
  :root {
    --rdx-fg: #e8e8e8;
    --rdx-muted: #9aa0a6;
    --rdx-border: #4a4a4a;
    --rdx-surface: #3a3a3c;
    --rdx-surface-alt: #353538;
  }
}
```

- [ ] **Step 2：`src/Convert/ResultRow.vue`**

```vue
<script setup>
const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, required: true },
  display: { type: String, required: true },
  raw: { type: String, required: true },
  isSource: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'paste'])
</script>

<template>
  <div
    class="row"
    :class="{ 'row--source': isSource, 'row--active': active }"
    @click="emit('copy', raw, name)"
  >
    <span class="row__label">{{ label }}</span>
    <span class="row__name">{{ name }}</span>
    <span class="row__value">{{ display }}</span>
    <span class="row__actions">
      <button class="btn" @click.stop="emit('copy', raw, name)">复制</button>
      <button class="btn btn--ghost" @click.stop="emit('paste', raw, name)">粘贴</button>
    </span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.row:hover {
  border-color: var(--rdx-accent);
}

.row--active {
  border-color: var(--rdx-accent);
  background: var(--rdx-surface-alt);
}

.row--source .row__label {
  color: var(--rdx-accent);
}

.row__label {
  width: 36px;
  font-weight: 600;
  font-size: 12px;
  color: var(--rdx-muted);
}

.row__name {
  width: 56px;
  font-size: 12px;
  color: var(--rdx-muted);
}

.row__value {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  word-break: break-all;
  user-select: text;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  color: #fff;
  background: var(--rdx-accent);
  cursor: pointer;
}

.btn--ghost {
  color: var(--rdx-fg);
  background: var(--rdx-surface-alt);
  border: 1px solid var(--rdx-border);
}
</style>
```

- [ ] **Step 3：`src/Convert/index.vue`**

```vue
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { convertAll } from '../utils/radix.js'
import ResultRow from './ResultRow.vue'

const props = defineProps({ enterAction: { type: Object, required: true } })

const input = ref('')
const forcedRadix = ref(0) // 0 = 自动识别
const activeIndex = ref(1) // 默认高亮 DEC
const toast = ref('')
const rootRef = ref(null)

let toastTimer = null
let observer = null

const result = computed(() => convertAll(input.value, forcedRadix.value || undefined))

/** 进入插件时用匹配到的内容预填 */
watch(
  () => props.enterAction,
  (action) => {
    if (action && (action.type === 'regex' || action.type === 'over') && action.payload) {
      input.value = String(action.payload)
    }
  },
  { immediate: true, deep: true }
)

/** 输入变化后高亮行回到第 2 行（DEC） */
watch(input, () => {
  activeIndex.value = 1
})

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1200)
}

function handleCopy(raw, name) {
  window.utools.copyText(raw)
  showToast(`已复制${name}：${raw.length > 40 ? raw.slice(0, 40) + '…' : raw}`)
}

function handlePaste(raw, name) {
  window.utools.hideMainWindowPasteText(raw)
}

function onKeydown(event) {
  if (!result.value.ok) return
  const rows = result.value.rows
  if (event.key === 'ArrowDown') {
    activeIndex.value = (activeIndex.value + 1) % rows.length
    event.preventDefault()
  } else if (event.key === 'ArrowUp') {
    activeIndex.value = (activeIndex.value - 1 + rows.length) % rows.length
    event.preventDefault()
  } else if (event.key === 'Enter') {
    const row = rows[activeIndex.value]
    if (event.metaKey || event.ctrlKey) handlePaste(row.raw, row.name)
    else handleCopy(row.raw, row.name)
    event.preventDefault()
  }
}

onMounted(() => {
  observer = new ResizeObserver(() => {
    const height = Math.ceil(rootRef.value?.getBoundingClientRect().height || 0)
    window.utools.setExpendHeight(Math.max(140, Math.min(height, 600)))
  })
  if (rootRef.value) observer.observe(rootRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  clearTimeout(toastTimer)
})
</script>

<template>
  <div ref="rootRef" class="convert">
    <div class="convert__head">
      <input
        v-model="input"
        class="input"
        placeholder="输入数值，如 0x7FFFFFFF / 0b1010 / 255"
        @keydown="onKeydown"
      />
      <select v-model.number="forcedRadix" class="select">
        <option :value="0">自动识别</option>
        <option :value="16">按 16 进制</option>
        <option :value="10">按 10 进制</option>
        <option :value="2">按 2 进制</option>
        <option :value="8">按 8 进制</option>
      </select>
    </div>

    <p v-if="result.ok" class="convert__hint">
      <span class="tag">按 {{ result.radix }} 进制解析</span>
      <span>点击任意行复制，↑↓ 选择、Enter 复制、⌘/Ctrl+Enter 粘贴回原窗口</span>
    </p>
    <p v-else class="convert__error">{{ result.message }}</p>

    <div v-if="result.ok" class="convert__rows">
      <ResultRow
        v-for="(row, index) in result.rows"
        :key="row.radix"
        :label="row.label"
        :name="row.name"
        :display="row.display"
        :raw="row.raw"
        :is-source="row.isSource"
        :active="index === activeIndex"
        @copy="handleCopy"
        @paste="handlePaste"
      />
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.convert {
  padding: 14px 16px 16px;
  box-sizing: border-box;
  color: var(--rdx-fg);
}

.convert__head {
  display: flex;
  gap: 8px;
}

.input {
  flex: 1;
  height: 36px;
  padding: 0 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  color: var(--rdx-fg);
  background: var(--rdx-surface);
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  outline: none;
}

.input:focus {
  border-color: var(--rdx-accent);
}

.select {
  height: 36px;
  padding: 0 6px;
  font-size: 13px;
  color: var(--rdx-fg);
  background: var(--rdx-surface);
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  outline: none;
}

.convert__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  font-size: 12px;
  color: var(--rdx-muted);
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--rdx-accent);
  color: #fff;
  font-size: 12px;
}

.convert__error {
  margin: 10px 0;
  font-size: 13px;
  color: #e5534b;
}

.convert__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 4：验证**

```bash
npm run dev
```
进入插件后手工核对：

| 输入 | 期望 |
|---|---|
| `0x7FFFFFFF` | DEC `2147483647`、BIN 31 个 1（4 位分组）、OCT `17777777777` |
| `0b1010_1010` | DEC `170`、HEX `AA` |
| `0o777` | DEC `511`、HEX `1FF` |
| `0xZZ` | 红字提示「「Z」不是合法的 16 进制数字」，不崩 |
| 空 | 提示「请输入一个数值」 |
| `０ｘ１Ｆ` | 等价于 `0x1F` → DEC 31 |
| 复制 DEC 行 | 粘贴到编辑器是 `2147483647`（无空格） |

- [ ] **Step 5：Commit**

```bash
git add src/Convert src/main.css
git commit -m "feat(ui): 四进制联动主界面 + 单行复制/粘贴 + 高度自适应"
```

---

## Task 8：解释视图 `InterpretView.vue`（位宽×有符号 + 字节序）

**Files：** Create `src/Convert/InterpretView.vue`；Modify `src/Convert/index.vue`

- [ ] **Step 1：`src/Convert/InterpretView.vue`**

```vue
<script setup>
import { computed, ref } from 'vue'
import { interpret, byteOrder, WIDTHS } from '../utils/radix.js'

const props = defineProps({ value: { type: null, required: true } })
const emit = defineEmits(['copy'])

const width = ref(32)
const info = computed(() => interpret(props.value, width.value))
const order = computed(() => byteOrder(props.value, width.value))
</script>

<template>
  <section class="interp">
    <header class="interp__head">
      <span class="interp__title">按位宽解释</span>
      <span class="interp__widths">
        <button
          v-for="w in WIDTHS"
          :key="w"
          class="chip"
          :class="{ 'chip--on': w === width }"
          @click="width = w"
        >
          {{ w }} 位
        </button>
      </span>
    </header>

    <div class="line">
      <span class="line__k">无符号</span>
      <span class="line__v">{{ info.unsigned }}</span>
      <button class="mini" @click="emit('copy', info.unsigned, '无符号值')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">有符号</span>
      <span class="line__v">{{ info.signed }}</span>
      <button class="mini" @click="emit('copy', info.signed, '有符号值')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">补码 HEX</span>
      <span class="line__v">{{ info.hex }}</span>
    </div>
    <div class="line">
      <span class="line__k">补码 BIN</span>
      <span class="line__v">{{ info.bin }}</span>
    </div>
    <div class="line">
      <span class="line__k">大端字节</span>
      <span class="line__v">{{ order.bigEndian }}</span>
      <button class="mini" @click="emit('copy', order.bigEndian, '大端字节')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">小端字节</span>
      <span class="line__v">{{ order.littleEndian }}</span>
      <button class="mini" @click="emit('copy', order.littleEndian, '小端字节')">复制</button>
    </div>
  </section>
</template>

<style scoped>
.interp {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--rdx-border);
}

.interp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.interp__title {
  font-size: 12px;
  color: var(--rdx-muted);
}

.chip {
  margin-left: 4px;
  padding: 2px 8px;
  border: 1px solid var(--rdx-border);
  border-radius: 10px;
  background: transparent;
  color: var(--rdx-muted);
  font-size: 12px;
  cursor: pointer;
}

.chip--on {
  border-color: var(--rdx-accent);
  background: var(--rdx-accent);
  color: #fff;
}

.line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  font-size: 13px;
}

.line__k {
  width: 64px;
  flex: none;
  color: var(--rdx-muted);
  font-size: 12px;
}

.line__v {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
  user-select: text;
}

.mini {
  padding: 1px 8px;
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  background: var(--rdx-surface-alt);
  color: var(--rdx-fg);
  font-size: 12px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2：在 `index.vue` 中接入**（在 `convert__rows` 之后、`toast` 之前）

```vue
      <InterpretView v-if="result.ok" :value="result.value" @copy="handleCopy" />
```

并在 `<script setup>` 顶部补 import：

```js
import InterpretView from './InterpretView.vue'
```

- [ ] **Step 3：验证**

| 输入 | 位宽 | 期望 |
|---|---|---|
| `0xFFFFFFFF` | 32 | 无符号 `4294967295`、有符号 `-1`、补码 HEX `FF FF FF FF`、小端 `ff ff ff ff` |
| `0x7FFFFFFF` | 32 | 有符号 `2147483647` |
| `0x0F` | 16 | 补码 BIN `0000 0000 0000 1111` |
| `0x12345678` | 32 | 大端 `12 34 56 78`、小端 `78 56 34 12` |
| `-1` | 8 | 无符号 `255`、补码 HEX `FF` |
| 切换 8/16/32/64 | — | 数值随宽度变化且不报错 |

- [ ] **Step 4：Commit**

```bash
git add src/Convert
git commit -m "feat(ui): 位宽×有符号 + 字节序解释视图"
```

---

## Task 9：匹配指令全链路 + 收尾

**Files：** Modify `src/Convert/index.vue`（如预填逻辑需按实测调整）、Create `README.md`

- [ ] **Step 1：按 Task 6 实测结论校正预填逻辑**（若 payload 含空格/下划线，`normalize` 已容错，一般无需改；若 `type` 不是 `regex`，改 `watch` 里的判断）

- [ ] **Step 2：`README.md`**（中文，包含：功能、4 条指令、开发/调试步骤、`development.main` 用 `127.0.0.1:5173/index.html` 的说明、打包范围、测试命令）

- [ ] **Step 3：全链路手工验收**

1. IDE 里选中 `0x7FFFFFFF` → uTools 热键 → 选「十六进制转换」→ 界面已预填 → 点 DEC 行「粘贴」→ **数字替换回 IDE 里的选中内容**
2. `0b1010` / `0o777` 走同样路径
3. `0xZZ` 之类的非法输入在搜索面板不会出现候选（正则不匹配）
4. 功能指令「进制转换」直接进入，输入框为空、无报错
5. 深浅色切换：文字/边框/背景都清晰
6. 高度：只有四行时约 300px，展开解释视图后自动变高，不出现内部滚动条

- [ ] **Step 4：构建验证**

```bash
npm run build && ls -R dist | head -20
```
Expected：生成 `dist/index.html` + `dist/assets/*`，`index.html` 里的资源引用是 `./assets/...`（相对路径）

- [ ] **Step 5：Commit + Push**

```bash
git add -A
git commit -m "feat: v1 完成（四进制联动 + 位宽/字节序 + 匹配指令）+ README"
git push
```

---

## 手工验收清单（v1 完成定义）

- [ ] `npm test` 全绿
- [ ] 四条指令在 uTools 搜索面板可见，模板指令已消失
- [ ] `0x` / `0b` / `0o` 前缀输入出现候选并能进入插件预填
- [ ] 四行实时联动正确，复制值不含分隔符
- [ ] 位宽 8/16/32/64 × 有符号/无符号正确（含 `0xFFFFFFFF` → `-1`）
- [ ] 大端/小端字节序正确（含 64 位、负数）
- [ ] 非法输入、空输入只提示不崩
- [ ] 深浅色下都清晰可读；高度自适应
- [ ] `npm run build` 产物路径正确

---

## 风险与回滚

| 风险 | 应对 |
|---|---|
| `payload` 实测形态与文档不符 | Task 6 先探测再实现；逻辑集中在 `index.vue` 一个 watch 里，改动局部 |
| `BigInt.asUintN` 对超宽输入的行为 | 已在 Task 4 用例覆盖（`0x1FF` 在 8 位下截断为 255） |
| 匹配指令在搜索面板不出现 | 用 devtools 检查 `plugin.json` 是否被 uTools 正确加载；注意 `\` 转义 |
| 改动破坏模板原有行为 | 有 git 历史，单个 Task 一个 commit，可 `git revert` |
| preload 删除后 uTools 报缺失 | `plugin.json` 里同步删掉 `preload` 字段（Task 5 已含） |

---

## P5（可选，v1 之后）：`mainPush` 零切换

**现状说明（重要，修正前期判断）：** 匹配指令被选中时，uTools 的默认行为是**打开插件界面**；要做到"选中候选后不打开插件、直接把结果粘贴回原窗口"，只能用 `feature.mainPush` + `utools.onMainPush(callback, selectCallback)`，在 `selectCallback` 里**不返回 true**（静默执行）并调用 `utools.hideMainWindowPasteText(...)`。

实现要点（待 P5 时展开为独立计划）：
- 新增 feature：`mainPush: true`，`cmds` 至少一条功能指令（`cmds` 为必填）
- `callback({ code, type, payload })` 中把输入文本交给 `convertAll`，返回 `[{ text: '十进制 2147483647', title: '...' }]`
- `selectCallback` 中区分"复制"与"粘贴"两种选项：返回 `true` 则进插件，`undefined` 则静默粘贴
- 只在能解析出结果时才推送候选项，避免污染搜索面板
