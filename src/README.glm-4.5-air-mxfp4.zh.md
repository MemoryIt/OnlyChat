<think>我们有一个项目，包含四个文件：PocketFlow.ts, LLMClient.ts, ChatNode.ts, index.ts。
 我们需要为整个项目撰写文档，包括每个文件的作用、类和函数的功能、参数、返回值等。

 首先，我们分析每个文件：

 1. PocketFlow.ts
    这是一个流程控制库，定义了多个类：BaseNode, Node, BatchNode, ParallelBatchNode, Flow, BatchFlow, ParallelBatchFlow。
    这些类用于构建工作流（流程图），每个节点可以执行一些操作，并返回一个动作（action），该动作用于决定下一个节点。

    BaseNode: 基础节点类，包含prep, exec, post三个方法，以及_run, run方法用于执行节点。
        - prep: 准备阶段，返回一个值，该值会传递给exec。
        - exec: 执行阶段，接收prep的结果，返回一个结果。
        - post: 后处理阶段，接收shared, prepRes, execRes，返回一个动作（字符串）用于决定下一个节点。
        - _run: 私有方法，依次调用prep, exec, post。
        - run: 公开方法，如果该节点有后继节点（successors），会警告。通常在Flow中不直接调用run，而是通过Flow的_orchestrate来调用。

        其他方法：
        - setParams: 设置节点参数。
        - next: 设置默认后继节点（动作"default"）。
        - on: 设置特定动作的后继节点。
        - getNextNode: 根据动作获取下一个节点。
        - clone: 克隆节点（包括参数和后继节点）。

    Node: 继承BaseNode，增加了重试机制（maxRetries, wait）和execFallback方法。
        - _exec: 尝试执行exec，最多maxRetries次，每次失败后等待wait秒，最后一次失败则调用execFallback。

    BatchNode: 继承Node，将exec接收的参数视为数组，对数组中的每个元素分别执行exec（串行），返回结果数组。

    ParallelBatchNode: 继承Node，对数组中的每个元素并行执行exec，返回结果数组。

    Flow: 继承BaseNode，表示一个流程图。
        - start: 起始节点。
        - _orchestrate: 私有方法，负责执行整个流程，从start开始，根据每个节点的post返回的动作决定下一个节点，直到没有节点为止。
        - _run: 调用prep，然后调用_orchestrate，最后调用post。
        - exec: 抛出错误，因为Flow本身不执行具体任务。

    BatchFlow: 继承Flow，表示批处理流程，prep方法返回一个参数数组（NP），对每个参数执行一次_orchestrate（串行）。

    ParallelBatchFlow: 继承BatchFlow，对prep返回的参数数组并行执行_orchestrate。

 2. LLMClient.ts
    这个类用于与大语言模型（LLM）进行交互，支持多个提供商（Provider），可以调用模型列表、聊天（普通和流式）等。

    属性：
    - config: 从配置文件读取的配置，包含多个ProviderConfig。

    方法：
    - constructor: 读取配置文件（默认为当前目录下的.json.env）。
    - getProvider: 根据名称获取Provider，如果没有指定则取第一个。
    - getProviderNames: 返回所有提供商名称。
    - fetchAPI: 封装API请求，根据提供商信息发送请求到`/chat/completions`端点。
    - getModelList: 获取指定提供商的所有模型列表。
    - callLLM: 调用LLM，返回完整回复。
    - callLLMUnifiedStream: 内部方法，用于处理流式响应，可以以回调或生成器模式返回数据。
    - callLLMStream: 处理流式响应，回调模式，返回完整回复。
    - callLLMStreamGenerator: 处理流式响应，生成器模式，返回完整回复。
    - chat: 调用LLM并打印结果（绿色）。
    - chatStream: 流式聊天，实时打印结果（绿色），最后换行。
    - chatStreamGenerator: 使用生成器进行流式聊天，实时打印结果（绿色），最后换行。

 3. ChatNode.ts
    这个类继承自Node，用于实现一个交互式聊天节点。它允许用户通过命令行与LLM进行对话。

    共享状态（SharedStore）：
    - llmClient: LLMClient实例。
    - messages: 消息数组，用于存储对话历史。
    - 其他任意属性。

    参数（InitLLMNodeParams）：
    - configPath: 配置文件路径，可选。

    方法：
    - ask: 使用readline向用户提问并返回答案。
    - getCurrentTimeString: 获取当前时间字符串，用于生成历史文件名。
    - SaveChatHistory: 将对话历史保存到ChatHistory目录下的文件中，文件名包含时间戳和模型名。
    - selectProvider: 从配置的提供商中让用户选择一个。
    - selectModel: 从提供商的模型列表中让用户选择一个（如果获取失败则使用默认模型）。
    - prep: 初始化LLMClient，让用户选择提供商和模型，返回{llmClient, selectedProviderName, selectedModelName}。
    - exec: 执行聊天循环，用户输入消息，调用LLMClient的chatStream获取回复，直到用户输入"exit"或"newchat"。每次循环都会将用户和助手消息添加到消息数组中，并保存历史（在exit或newchat时）。
    - post: 根据exec返回的结果，如果是"newchat"则返回"continue"动作，以便Flow可以继续执行（这里将后继节点设置为自身，从而开始新的对话）。

 4. index.ts
    主程序入口，创建一个SharedStore，初始化ChatNode，设置参数（配置文件路径），设置后继节点（当返回"continue"时回到自身），然后创建Flow并运行。

 接下来，我们为整个项目撰写文档。由于代码较长，我们将分文件撰写，并最后给出一个总览。

 注意：我们使用Markdown格式，包括标题、描述、类和方法的说明等。

 开始撰写文档：</think>
# TypeScript 项目文档

## 项目概述

本项目是一个基于 TypeScript 的流程控制框架与语言模型客户端集成系统，主要用于构建交互式对话流程。系统通过 `PocketFlow` 提供流程控制能力，并通过 `LLMClient` 与语言模型交互，`ChatNode` 实现用户交互界面，最后由 `index.ts` 整合所有组件启动应用。

## 文件说明

### 1. PocketFlow.ts

**功能**：核心流程控制框架，定义节点和流程的执行逻辑。

#### 主要类

```typescript
class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject>
```
- **功能**：所有流程节点的基类，定义节点生命周期方法
- **核心方法**：
  - `prep(shared: S)`：准备阶段，返回执行所需数据
  - `exec(prepRes: unknown)`：执行阶段，处理业务逻辑
  - `post(shared: S, prepRes: unknown, execRes: unknown)`：后处理阶段，返回下一动作
  - `run(shared: S)`：执行节点（警告有后继节点时使用）
  - `setParams(params)`：设置节点参数
  - `next(node)`：设置默认后继节点
  - `on(action, node)`：设置特定动作的后继节点
  - `clone()`：节点深度克隆

```typescript
class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode
```
- **功能**：支持重试机制的执行节点
- **特性**：
  - `maxRetries`：最大重试次数
  - `wait`：重试间隔（秒）
  - `execFallback(prepRes, error)`：重试失败后的回调
  - `_exec(prepRes)`：实现带重试逻辑的执行

```typescript
class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode
```
- **功能**：流程编排器，管理节点流转
- **特性**：
  - `start`：起始节点
  - `_orchestrate(shared, params?)`：执行整个流程
  - 自动处理节点克隆和参数传递

```typescript
class BatchFlow<S, P, NP> extends Flow
```
- **功能**：批处理流程，串行处理多个参数集
- **特性**：`prep()` 返回参数数组，对每个参数执行完整流程

```typescript
class ParallelBatchFlow<S, P, NP> extends BatchFlow
```
- **功能**：并行批处理流程
- **特性**：使用 `Promise.all` 并行执行多个参数集

### 2. LLMClient.ts

**功能**：语言模型客户端，支持多种提供商和流式响应

#### 核心方法

```typescript
constructor(configPath?: string)
```
- **功能**：初始化客户端，从配置文件加载提供商信息
- **配置文件格式**：
  ```json
  {
    "providers": [
      {
        "name": "provider1",
        "apikey": "key",
        "baseurl": "https://api.example.com"
      }
    ]
  }
  ```

```typescript
async callLLM(messages, provider?, model?): Promise<string>
```
- **功能**：同步调用语言模型
- **参数**：
  - `messages`: 消息数组
  - `provider`: 提供商名称
  - `model`: 模型名称
- **返回**：模型回复文本

```typescript
async chatStream(messages, onChunk?, provider?, model?): Promise<string>
```
- **功能**：流式调用语言模型
- **特性**：实时显示响应内容

```typescript
async chatStreamGenerator(messages, provider?, model?): AsyncGenerator<string>
```
- **功能**：生成器模式的流式调用
- **返回**：异步生成器，逐块产生响应

### 3. ChatNode.ts

**功能**：交互式聊天节点，实现用户与LLM的对话流程

#### 共享状态类型
```typescript
type SharedStore = {
  llmClient?: LLMClient;
  messages?: Message[];
  [key: string]: unknown;
};
```

#### 核心方法

```typescript
async prep(shared: SharedStore)
```
- **功能**：初始化LLM客户端并选择提供商/模型
- **流程**：
  1. 加载配置
  2. 用户选择提供商
  3. 用户选择模型
  - **返回**：`{llmClient, selectedProviderName, selectedModelName}`

```typescript
async exec(prepRes)
```
- **功能**：执行主对话循环
- **交互流程**：
  1. 显示欢迎信息
  2. 循环接收用户输入
  3. 调用LLM生成回复
  4. 保存对话历史
  5. 特殊命令处理：
     - `exit`: 结束对话
     - `newchat`: 新建对话（返回"continue"动作）
- **返回**：用户命令字符串

```typescript
async SaveChatHistory(messages, model)
```
- **功能**：保存对话历史到文件
- **存储位置**：`/ChatHistory/T@model.json`

### 4. index.ts

**功能**：应用入口点，整合所有组件启动对话流程

#### 核心流程
1. 初始化共享状态
2. 创建聊天节点并设置配置路径
3. 设置节点循环：当返回"continue"时回到自身
4. 创建流程并运行
5. 错误处理

## 使用指南

### 1. 配置文件
创建 `.json.env` 文件：
```json
{
  "providers": [
    {
      "name": "openai",
      "apikey": "YOUR_API_KEY",
      "baseurl": "https://api.openai.com/v1"
    }
  ]
}
```

### 2. 启动应用
```bash
npm run start
```

### 3. 交互流程
1. 选择提供商
2. 选择模型
3. 开始对话：
   - 输入消息与LLM交互
   - 输入 `exit` 结束对话
   - 输入 `newchat` 开始新对话

### 4. 对话历史
- 所有对话自动保存到 `ChatHistory` 目录
- 文件名格式：`YYYY-MM-DDTHH:MM:SS@model.json`

## 扩展点

1. **自定义节点**：
   - 继承 `BaseNode` 或 `Node`
   - 实现 `prep/exec/post` 方法

2. **新提供商支持**：
   - 在配置文件添加新提供商
   - 确保API兼容OpenAI格式

3. **流程扩展**：
   - 使用 `BatchFlow` 处理批量任务
   - 使用 `ParallelBatchFlow` 实现并行处理

## 架构特点

1. **流程控制**：
   - 基于动作的节点流转
   - 支持节点克隆和参数传递
   - 内置重试和批处理机制

2. **LLM集成**：
   - 多提供商支持
   - 流式和同步调用
   - 自动历史保存

3. **交互设计**：
   - 命令行友好界面
   - 特殊命令支持
   - 自动模型选择

4. **类型安全**：
   - 全面的 TypeScript 类型定义
   - 泛型支持灵活的共享状态
   - 参数类型约束