import { Flow } from "./PocketFlow.js";
import type { SharedStore } from './ChatNode.js';
import { ChatNode } from './ChatNode.js';

async function main() {
  const shared: SharedStore = {};
  const chatnode = new ChatNode();
  chatnode.setParams({configPath:'./.json.env'})
  chatnode.on("continue", chatnode);
  const pipeline = new Flow(chatnode);
  await pipeline.run(shared);
}

main().catch(console.error);