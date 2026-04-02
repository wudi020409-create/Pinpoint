一、一句话介绍

Pinpoint 是一个浏览器插件，让你在网页上像聊天一样给 AI 写修改指令。

从"帮我改一下那个按钮"到 @[button.submit] 改为绿色 @[header] 里面。

---
二、场景介绍

作为一个产品经理或开发者，在与 AI 协作开发前端 demo 时，最大的痛点是：
eg：你说"改一下那个蓝色按钮"，AI 一脸懵——它看不到你在指哪个。
"人类看着屏幕形容" vs "AI 看着代码理解" 之间有一道鸿沟。
谁可能会用？
- 产品经理：制作demo；标注问题，发给 AI 或开发
- 开发者？
- 设计师？
- ......
注：使用Cursor的小伙伴们，可以打开自带的内置浏览器，本插件主要是针对Opencode或者小龙虾的用户。

---
三、核心价值

🎯 精准锚定
把"那个蓝色按钮"变成 div.header > button.login 的精确坐标，附带 DOM 结构和源码路径。
💬 Chat with DOM
像聊天一样输入指令，点击元素自动变成 @[tag] 引用标签嵌入文本。一句话可以引用多个元素。
⚡ 极简心智
启用 → 输入指令（含元素引用）→ 关闭 → 粘贴。全程无保存、无下载、无上传。

---
Pinpoint UI Tasks
AI System Instructions:
Locate each element using the provided Context & References below.
Match the @[tag] in the Instruction to the Reference list.
Use Text Content and Selectors to pinpoint the exact code location.
Apply the requested changes.
Instruction 1
@[button#filterBtn] 把这里的文案改为XXX
Context & References
Reference 1 (@[button#filterBtn]):
  Text Content: "筛选"
  Selector: #filterBtn
  HTML: <button class="filter-btn oc-hover" id="filterBtn" onclick="toggleDropdown()">           <svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 7h8M6 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>           筛选         </button>...

---
四、功能介绍

Chat Composer

- 输入框支持自由文本 + 元素引用混合输入
- Enter 发送，Shift + Enter 换行
- 输入框自适应高度

元素选取

- 点击「🎯 选取元素」进入 Pick 模式（光标变十字准星）
- 鼠标悬浮时元素高亮（蓝色虚线边框）
- 点击元素自动插入 @[tag] 标签
- 支持快捷键 P 开始选取、S 停止选取

侧边栏

- 消息气泡：每条任务以聊天气泡形式展示，@[tag] 标签高亮
- 单条复制：点击气泡右上角 📋 复制单条
- 单条删除：点击 🗑️ → 二次确认后删除
- Copy All：一键复制全部任务，格式化为 AI Prompt
- 收起/展开：C 收起、E 展开，不遮挡页面

Badge 标注

- 每个被引用的元素会在页面上显示绿色 Badge（@[button.submit]）
- Badge 位置跟随元素
- 删除任务后自动清理

快捷键

🎯P 开始选取元素
🛑S 停止选取
✅A 提交任务
👈C 收起面板
👉E 展开面板
📋ESC 复制并退出

---
复制给 AI 的内容格式
插件生成的内容是专门为 AI 优化的 Prompt：
# Pinpoint UI Tasks

**AI System Instructions**:
1. Locate each element using the provided **Context & References** below.
2. Match the `@[tag]` in the Instruction to the Reference list.
3. Use Text Content and Selectors to pinpoint the exact code location.
4. Apply the requested changes.

## Instruction 1

> 把 @[button.submit] 改为绿色背景

### Context & References
- **Reference 1** (@[button.submit]):
  - **Text Content**: "提交"
  - **Selector**: `div.card > button.submit`
  - **Source File**: `src/components/Card.tsx:45`
  - **HTML**: `<button class="submit">提交</button>`

---
五、如何安装

Step 1：下载插件源码

Step 2：打开浏览器扩展管理
- Chrome：地址栏输入 chrome://extensions/
- Edge：地址栏输入 edge://extensions/

Step 3：开启「开发者模式」

Step 4：加载已解压的扩展程序
点击「加载已解压的扩展程序」→ 选择 pinpoint/ 目录

Step 5：打开你的页面
Pinpoint 支持以下环境：
- localhost / 127.0.0.1
- file:/// 本地 HTML 文件
- 任意 http:// / https:// 网页

Step 6：开始使用
1. 点击浏览器工具栏的 Pinpoint 图标
1. 插件自动打开，进入 Pick 模式
2. 点击元素 → 输入指令 → Enter 提交
3. 复制 → 粘贴给 AI

---
常见问题

Q：支持哪些框架？A：任何网页都通用。React 项目可自动提取源码路径，其他框架通过 DOM Selector 定位。

Q：多个任务怎么批量处理？A：所有任务一次性复制到剪贴板，AI 收到后逐个处理。

Q：数据安全吗？A：插件不上传任何数据，不联网，不存储。剪贴板是唯一的输出通道。

欢迎大家留言或者私信我沟通想法
