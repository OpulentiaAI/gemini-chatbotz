"use node";

import { action } from "./_generated/server";

export const testDeployment = action({
  args: {},
  handler: async () => {
    console.log("[deployTest] Deployment test - 2025-01-31");
    return { 
      success: true, 
      timestamp: new Date().toISOString(),
      message: "Deployment test successful"
    };
  },
});
