import * as fs from 'fs';
import * as path from 'path';

interface ProviderConfig {
  name: string;
  apikey: string;
  baseurl: string;
}

interface Config {
  providers: ProviderConfig[];
}

type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

type Message = { role: "system" | "user" | "assistant"; content: string };

export class LLMClient {
  private config: Config;

  constructor(configPath: string = path.join(process.cwd(), '.json.env')) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (err) {
      console.error('Failed to read config file:', err);
      throw err;
    }
  }

  private getProvider(providerName?: string) {
    const provider = providerName
      ? this.config.providers.find(p => p.name === providerName)
      : this.config.providers[0];
    if (!provider) throw new Error(`Provider not found: ${providerName}`);
    return provider;
  }

  public getProviderNames(): string[] {
    return this.config.providers.map(p => p.name);
  }

  private async fetchAPI(providerName: string | undefined, model: string, messages: Message[], stream = false) {
    const provider = this.getProvider(providerName);
    const res = await fetch(`${provider.baseurl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apikey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res;
  }

  public async getModelList(providerName: string): Promise<string[]> {
    const provider = this.getProvider(providerName);
    const res = await fetch(`${provider.baseurl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${provider.apikey}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
    const result: ModelsResponse = await res.json();
    return result.data.map(m => m.id);
  }

  async callLLM(messages: Message[], providerName: string = "local", model: string = "qwen3-30b-a3b"): Promise<string> {
    const res = await this.fetchAPI(providerName, model, messages, false);
    const data = await res.json();
    if (!data?.choices?.[0]?.message?.content) throw new Error(JSON.stringify(data));
    return data.choices[0].message.content.trim();
  }

  private async *callLLMUnifiedStream(
    messages: Message[],
    options: {
      mode: 'callback' | 'generator';
      onChunk?: (chunk: string) => void;
      providerName?: string;
      model?: string;
    }
  ): AsyncGenerator<string, void, unknown> {
    const { mode, onChunk, providerName = "local", model = "qwen3-30b-a3b" } = options;
    const res = await this.fetchAPI(providerName, model, messages, true);
    if (!res.body) throw new Error("Response body is null");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                if (mode === 'callback') onChunk?.(content);
                else if (mode === 'generator') yield content;
              }
            } catch (err) {
              console.warn("Failed to parse stream data:", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callLLMStream(
    messages: Message[],
    onChunk?: (chunk: string) => void,
    providerName: string = "local",
    model: string = "qwen3-30b-a3b"
  ): Promise<string> {
    let fullContent = '';
    for await (const chunk of this.callLLMUnifiedStream(messages, {
      mode: 'callback',
      onChunk: (c) => {
        fullContent += c;
        onChunk?.(c);
      },
      providerName,
      model
    })) {}
    return fullContent;
  }

  private async *callLLMStreamGenerator(
    messages: Message[],
    providerName: string = "local",
    model: string = "qwen3-30b-a3b"
  ): AsyncGenerator<string, void, unknown> {
    yield* this.callLLMUnifiedStream(messages, { mode: 'generator', providerName, model });
  }

  async chat(messages: Message[], providerName: string = "local", model: string = "qwen3-30b-a3b"): Promise<string> {
    const result = await this.callLLM(messages, providerName, model);
    process.stdout.write(`\x1b[32m${result}\x1b[0m`);
    return result;
  }

  async chatStream(messages: Message[], providerName: string = "local", model: string = "qwen3-30b-a3b"): Promise<string> {
    const result = await this.callLLMStream(messages, (chunk) => {
      process.stdout.write(`\x1b[32m${chunk}\x1b[0m`);
    }, providerName, model);
    process.stdout.write('\n');
    return result;
  }

  async chatStreamGenerator(messages: Message[], providerName: string = "local", model: string = "qwen3-30b-a3b"): Promise<string> {
    let fullContent = '';
    for await (const chunk of this.callLLMStreamGenerator(messages, providerName, model)) {
      process.stdout.write(`\x1b[32m${chunk}\x1b[0m`);
      fullContent += chunk;
    }
    process.stdout.write('\n');
    return fullContent;
  }
}