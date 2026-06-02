---
name: markdown-to-ppt
description: 将记录想法、项目方案、产品思路、研究笔记或会议材料的 Markdown 文件整理为可确认的 PPT 大纲，生成中英文友好的单文件 HTML 幻灯片样稿，并在用户明确要求时转换为 PPTX。Use when asked to turn Markdown notes, ideas, outlines, bilingual Chinese/English content, product plans, strategy notes, or rough documents into a slide outline, HTML presentation draft, or PPTX deck.
---

# Markdown 转 PPT

## 总览

使用本技能把一个 Markdown 想法稿转换为 PPT。流程必须保留两个确认点：先让用户确认 Markdown 格式的 PPT 大纲，再让用户确认 HTML 样稿；只有用户明确要求时才继续生成 PPTX。

本技能面向 Codex、Claude Code、OpenCode、OpenClaw 等代码 Agent。不要依赖 Codex 专属工具、浏览器插件或 MCP。可以读取本技能目录下的脚本和参考文件，并按当前 Agent 可用的 Node.js 环境执行。

## 语言规则

- 自动识别输入语言：中文稿默认输出中文，英文稿默认输出英文，中英混合稿默认保留双语语境。
- 用户要求“双语 PPT”时，每页生成中英文对应内容。推荐结构是中文主标题 + 英文副标题；正文按信息密度选择并列双语、上下分层或重点词双语标注。
- 不要机械逐句翻译。优先保持演示叙事自然、页面可读、术语一致。
- 用户未要求双语时，不额外扩写另一种语言。

## 标准流程

### 1. 读取并理解 Markdown

读取用户提供的 Markdown 文件或文本。判断原稿结构：

- 如果章节、层级和论述顺序已经清楚，保留其主线并压缩成 PPT 叙事。
- 如果章节不清楚，重新理解并分章节整理。
- 章节层级默认 2 层，最多 3 层。不要生成超过 3 层的 PPT 大纲。
- 删除重复、跑题和弱相关内容，但保留原文中的关键观点、数据、例子、结论和限制条件。

### 2. 输出 PPT 大纲并等待确认

先输出 Markdown 格式的大纲，不要直接生成 HTML。大纲建议包含：

```markdown
# PPT 大纲 / Slide Outline

## 1. 封面
- 标题：
- 副标题：

## 2. 章节名
### 2.1 幻灯片标题
- 核心观点：
- 页面内容：
- 建议视觉：
```

大纲确认提示要简短明确，例如：“请确认这个大纲方向是否可行；如果没问题，我会继续生成 HTML 样稿。”

### 3. 选择样式

读取 `references/styles.md`。如果用户没有指定样式，默认使用样式一：Linear / Notion。四种样式为：

- 样式一：Linear / Notion，适合结构清晰、现代、高效、产品化。
- 样式二：Apple Keynote 极简，适合高级、愿景感、未来感、聚焦。
- 样式三：咨询公司风格，适合专业、可信、逻辑严密、适合决策。
- 样式四：现代 SaaS 官网风格，适合智能、开放、平台化、增长、产品价值。

### 4. 生成 HTML 样稿

根据确认后的大纲和所选样式生成完整单文件 HTML：

- 页面比例为 16:9。
- 每页使用 `<section class="slide">`，封面使用 `<section class="slide cover">`。
- CSS 写在同一 HTML 文件内。
- 不依赖外部图片资源。
- 不依赖复杂外部库。
- 所有内容必须能被后续脚本解析成 PPTX。
- 推荐输出文件名：`<topic-slug>-slides.html`。

HTML 必须同时包含 `pptx-spec`：

```html
<script type="application/json" id="pptx-spec">
{
  "version": 1,
  "size": "LAYOUT_WIDE",
  "theme": "linear-notion",
  "slides": [
    {
      "type": "cover",
      "title": "标题",
      "subtitle": "副标题",
      "background": "#F8FAFC",
      "elements": [
        {
          "kind": "text",
          "text": "标题",
          "x": 0.8,
          "y": 1.0,
          "w": 11.7,
          "h": 0.8,
          "fontSize": 34,
          "color": "#111827",
          "bold": true
        }
      ]
    }
  ]
}
</script>
```

`pptx-spec.slides` 数量必须与 `section.slide` 数量一致。坐标单位使用英寸，16:9 宽屏为 13.333 x 7.5。

支持的 `elements.kind`：

- `text`：文本块，支持 `text`、`x`、`y`、`w`、`h`、`fontSize`、`color`、`bold`、`align`、`valign`。
- `card`：圆角卡片，支持 `x`、`y`、`w`、`h`、`fill`、`line`、`radius`、`title`、`body`。
- `tag`：轻量标签，支持 `text`、`x`、`y`、`w`、`h`、`fill`、`color`。
- `shape`：基础图形，支持 `shape`、`x`、`y`、`w`、`h`、`fill`、`line`。
- `line`：线条或箭头，支持 `x`、`y`、`w`、`h`、`color`、`arrow`。

### 5. 自我矫正

在交付 HTML 前检查并修正：

- 信息密度是否过高或过低。
- 标题是否是观点表达，而不是普通标签。
- 图文比例是否合理。
- 配色是否符合所选风格。
- 字号是否适合 16:9 演示。
- 卡片布局是否对齐、留白是否均衡。
- 图表形式是否与内容匹配。
- 每页是否过满。
- 背景与字体颜色是否过近导致难以辨识。

修正后运行：

```bash
node /path/to/markdown-to-ppt/scripts/validate_deck_html.js <slides.html>
```

### 6. 交付 HTML 并等待确认

把 HTML 文件路径交给用户，并说明已经完成自检。询问是否有修改点。若用户提出修改，更新 HTML 后再次执行第 5 步。

### 7. 可选生成 PPTX

只有用户明确要求“生成 PPTX”或“根据 HTML 样稿生成 PPTX”时才执行：

```bash
node /path/to/markdown-to-ppt/scripts/html_to_pptx.js <slides.html> <slides.pptx>
```

PPTX 要求：

- 每个 `section.slide` 对应一页幻灯片。
- 比例为 16:9。
- 尽量复刻 HTML 的视觉风格、布局、字号、颜色、卡片和图形关系。
- PPTX 转换追求高保真近似，不承诺逐像素还原浏览器渲染。

如果缺少 `pptxgenjs`，脚本会提示安装方式。Codex 通常可使用 bundled Node runtime；Claude Code、OpenCode、OpenClaw 可在本地项目安装 `pptxgenjs` 后运行。

## 脚本

- `scripts/validate_deck_html.js`：检查 HTML 是否符合可转 PPTX 的基本结构。
- `scripts/html_to_pptx.js`：根据 HTML 中的 `pptx-spec` 生成 PPTX。

## 输出纪律

- 先大纲，后 HTML，再可选 PPTX。
- 不要跳过用户确认点。
- 不要把样式说明塞进幻灯片正文。
- 不要输出依赖外部图片或在线 CSS 的 HTML。
- 不要生成超过 3 层的章节结构。
- 不要在用户未要求时自动生成 PPTX。
