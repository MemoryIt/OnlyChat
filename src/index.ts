import { Flow } from "./PocketFlow.js";
import type { SharedStore } from './ChatNode.js';
import { ChatNode } from './ChatNode.js';

async function main() {
  const shared: SharedStore = {};
  const chatnode = new ChatNode();
  chatnode.on("continue", chatnode);
  const pipeline = new Flow(chatnode);
  pipeline.setParams({configPath:'./.json.env.example'});
  await pipeline.run(shared);
}

main().catch(console.error);