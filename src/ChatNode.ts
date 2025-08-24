import { Node, Flow } from "./PocketFlow.js";
import readline from "readline";
import { LLMClient } from './LLMClient.js';
import * as fs from 'fs';
import * as path from 'path';

export type SharedStore = {
  llmClient?: LLMClient;
  messages?: { role: "system" | "user" | "assistant"; content: string }[];
  [key: string]: unknown;
};

interface InitLLMNodeParams extends Partial<Record<string, unknown>> {
  configPath?: string;
}

/**
 * ChatNode: Handles interactive conversation with user and LLM.
 */
export class ChatNode extends Node<SharedStore, InitLLMNodeParams> {
  private async ask(q: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a); }));
  }

  private async getCurrentTimeString(): Promise<string> {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  private async SaveChatHistory(messages: { role: "system" | "user" | "assistant"; content: string }[],model:string): Promise<void> {
    const dir = path.join(process.cwd(), 'ChatHistory');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${await this.getCurrentTimeString()}@${model}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
  }

 /**
   * Select provider from available providers
   */
  private async selectProvider(llmClient: LLMClient): Promise<string> {
    const providers = llmClient.getProviderNames();
    if (providers.length === 0) throw new Error("No LLM provider found in config.");
    
    console.log("Available Providers:");
    providers.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
    
    while (true) {
      const idx = parseInt(await this.ask("Select provider (index): "), 10) - 1;
      if (idx >= 0 && idx < providers.length) return providers[idx] as string;
      console.log("Invalid choice. Please try again.");
    }
  }


  /**
   * Select model from available models for the given provider
   */
  private async selectModel(llmClient: LLMClient, provider: string): Promise<string> {
    let models: string[] = [];
    try {
      models = await llmClient.getModelList(provider);
    } catch (e) {
      console.warn(`Failed to fetch models for ${provider}: ${(e as Error).message}`);
      models = ['default-model'];
    }
    
    console.log(`\nAvailable Models for ${provider}:`);
    models.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
    
    while (true) {
      const idx = parseInt(await this.ask("Select model (index): "), 10) - 1;
      if (idx >= 0 && idx < models.length) return models[idx] as string;
      console.log("Invalid choice. Please try again.");
    }
  }

  async prep(shared: SharedStore): Promise<{
    llmClient: LLMClient;
    selectedProviderName: string;
    selectedModelName: string;
  }> {
    const configPath = this._params.configPath || './.json.env';
    const llmClient = new LLMClient(configPath);
    const provider = await this.selectProvider(llmClient);
    const model = await this.selectModel(llmClient, provider);
    return { llmClient, selectedProviderName: provider, selectedModelName: model };
  }

  async exec(prepRes: {
    llmClient: LLMClient;
    selectedProviderName: string;
    selectedModelName: string;
  }): Promise<string> {
    const { llmClient, selectedProviderName, selectedModelName } = prepRes;
    let messages: { role: "system" | "user" | "assistant"; content: string }[] = [{ role: "system", content: "You are a helpful assistant." }];
    console.log("\x1b[32m🤖: Welcome to the OnlyChat! Type 'exit' to end the conversation. Type 'newchat' to start a new conversation. Chat records will be automatically saved to the ChatHistory directory.\x1b[0m");

    while (true) {
      const userInput = await this.ask("user: ");
      if (userInput === "exit" || userInput === "newchat") {
        await this.SaveChatHistory(messages,selectedModelName);
        return userInput;
      }
      messages.push({ role: "user", content: userInput });
      process.stdout.write("\x1b[32m🤖: \x1b[0m");
      const modelOutput = await llmClient.chatStream(messages, selectedProviderName, selectedModelName);
      messages.push({ role: "assistant", content: modelOutput });
    }
  }

  async post(shared: SharedStore, prepRes: undefined, execRes:string): Promise<string | undefined> {
    if(execRes==="newchat") return "continue";
    return undefined;
  }
}
