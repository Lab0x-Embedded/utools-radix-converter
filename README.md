# 进制转换（uTools 插件）

嵌入式 / 开发场景常用的进制转换工具，基于 uTools + Vue 3 + Vite 构建。

## 功能

- **四进制联动**：HEX / DEC / BIN / OCT 实时互转，点击任意行即可复制（复制内容不带分组分隔符，可直接粘进代码）
- **自动识别前缀**：`0x` / `0b` / `0o` 自动判定进制，也可手动指定「按 N 进制」解析
- **按位宽解释**：8 / 16 / 32 / 64 位下的无符号值、有符号值（补码）——`0xFFFFFFFF` → `4294967295` / `-1`
- **字节序**：大端 / 小端字节序列，如 `0x12345678` → `12 34 56 78` / `78 56 34 12`
- **容错**：支持空格、下划线、逗号分隔；支持全角字符（`０ｘ１Ｆ`）；支持负数；任意位数用 `BigInt` 计算，不丢精度
- 深浅色跟随系统，窗口高度自适应

## 指令

| 触发方式 | 指令 | 说明 |
|---|---|---|
| 搜索打开 | `进制转换` / `进制` / `radix` / `base` | 打开转换界面 |
| 匹配输入 | `十六进制转换` | 输入或选中 `0x...` 时出现 |
| 匹配输入 | `二进制转换` | 输入或选中 `0b...` 时出现 |
| 匹配输入 | `八进制转换` | 输入或选中 `0o...` 时出现 |

### 推荐用法（看代码时）

1. 在 IDE 里选中 `0x7FFFFFFF`
2. 按 uTools 热键（选中内容自动带入主搜索框）
3. 选择「十六进制转换」进入界面（已自动预填）
4. 点 DEC 行的「粘贴」→ 十进制结果直接替换回 IDE 里的选中内容

也可以给「进制转换」指令配一个全局快捷键（uTools 设置 → 快捷键）。

### 界面快捷键

| 按键 | 作用 |
|---|---|
| `↑` / `↓` | 切换高亮行 |
| `Enter` | 复制高亮行 |
| `⌘/Ctrl + Enter` | 把高亮行的值粘贴回上一个活动窗口 |
| 点击任意行 | 复制该行 |

## 开发

```bash
npm install
npm run dev        # 启动 Vite（默认 http://localhost:5173）
npm test           # 运行 Vitest 单元测试
npm run build      # 构建到 dist/
```

调试步骤：

1. 安装 uTools 与「uTools 开发者工具」插件
2. `npm run dev` 启动开发服务器
3. 在开发者工具中「接入开发」，指向本项目目录
4. 进入插件后按 `⌘/Ctrl + Shift + I` 打开 devtools
5. 建议在开发者工具设置里开启「退出到后台立即结束运行」，保证每次进入都加载最新代码

> 若接入开发后白屏，把 `public/plugin.json` 的 `development.main` 从
> `http://localhost:5173` 改成 `http://127.0.0.1:5173/index.html`。

## 打包发布

只打包 `dist/` 内容 + `public/plugin.json` + `public/logo.png`（**不要把项目根目录整个打包**）。
`vite.config.js` 里 `base: './'` 已配好，构建产物使用相对路径。

本项目**没有 preload**：所有计算与剪贴板操作都由 uTools 主窗口 API 完成（`utools.copyText`、`utools.hideMainWindowPasteText`、`utools.setExpendHeight`），不需要 Node.js 能力。

## 目录结构

```
public/plugin.json      插件配置（指令、入口、logo）
src/App.vue             路由壳：按进入的 feature code 渲染页面
src/Convert/index.vue   主界面：输入框 + 四行结果 + 键盘交互
src/Convert/ResultRow.vue     单行结果（复制 / 粘贴）
src/Convert/InterpretView.vue 位宽×有符号 + 字节序
src/utils/radix.js      转换核心（纯函数，无 Vue 依赖）
src/utils/radix.test.js 单元测试
```

## 已知限制 / 后续计划

- 只支持 2 / 8 / 10 / 16 四种进制
- 暂不支持 IEEE754 浮点、位图视图、历史收藏
- 十进制裸数字不做匹配指令（避免匹配手机号、端口号等造成搜索面板污染）
- 让「选候选即静默粘贴回原窗口」需要 `mainPush`（`utools.onMainPush`），尚未实现
