"use node";

import { action } from "./_generated/server";
import { gateway } from "ai";
import { generateText } from "ai";

export const testGatewayDirect = action({
  args: {},
  handler: async () => {
    console.log("[testGateway] Starting test...");
    console.log("[testGateway] AI_GATEWAY_API_KEY present:", !!process.env.AI_GATEWAY_API_KEY);
    
    try {
      const model = gateway("moonshotai/kimi-k2.5");
      console.log("[testGateway] Model created, provider:", model.provider);
      console.log("[testGateway] Model ID:", model.modelId);
      
      const result = await generateText({
        model,
        prompt: "Say hi in one word",
      });
      
      console.log("[testGateway] Success! Response:", result.text);
      return { success: true, text: result.text, provider: model.provider };
    } catch (error: any) {
      console.error("[testGateway] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
});
