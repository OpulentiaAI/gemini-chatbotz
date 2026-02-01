# Convex Deployment Synchronization Issue

## Problem
Convex deployments from both the main directory and worktree are **succeeding locally** but **not updating the production runtime** at `https://brilliant-ferret-250.convex.cloud`.

## Evidence
1. **Local deployments succeed**: `✔ Deployed Convex functions to https://brilliant-ferret-250.convex.cloud`
2. **Runtime doesn't update**: New functions like `testGLM47:testKimiDirect` and `testGateway:testGatewayDirect` don't appear in the available functions list
3. **Code changes don't take effect**: The runtime still uses old OpenRouter initialization code instead of the new Fireworks/AI Gateway routing

## What We've Tried
- ✅ Deployed from worktree with `CONVEX_DEPLOYMENT=prod:brilliant-ferret-250`
- ✅ Deployed from main directory with `CONVEX_DEPLOYMENT=prod:brilliant-ferret-250`
- ✅ Updated convex package from 1.29.3 to 1.31.7
- ✅ Verified bundle contents with `--debug-bundle-path` (shows correct code)
- ✅ Used verbose deployment (`-v`) to confirm bundling
- ✅ Committed and pushed changes to git
- ❌ Runtime still shows old code and missing functions

## Current Runtime State
The production runtime at `brilliant-ferret-250` is frozen with:
- Old OpenRouter-only routing (no AI Gateway or Fireworks native support)
- Missing new functions: `testKimiDirect`, `testGatewayDirect`
- Old validator caching issue (union validator instead of string validator)

## Fireworks Kimi K2.5 Status
### What's Ready
- ✅ Fireworks API key configured: `FIREWORKS_API_KEY=fw_J3Yp2BT45ukbtdmbZWzXHQ`
- ✅ Code written in `agent.ts` to use native Fireworks SDK for Kimi K2.5
- ✅ Model ID: `accounts/fireworks/models/kimi-k2p5`
- ✅ Thread creation works with this model ID
- ✅ Agent routing logic: `isKimiK25 ? fireworksNative("accounts/fireworks/models/kimi-k2p5")`

### What's Blocked
- ❌ Runtime still uses old OpenRouter code
- ❌ Sending messages fails because runtime doesn't have Fireworks integration
- ❌ Cannot test actual Kimi K2.5 responses until deployment syncs

## OpenRouter Credit Issue
OpenRouter account shows `limit_remaining: null` but API returns:
```
"Insufficient credits. Add more using https://openrouter.ai/settings/credits"
```
This blocks testing any OpenRouter models until credits are added.

## Next Steps
1. **Investigate Convex deployment configuration**
   - Check if there's a deployment lock or cache
   - Verify the deployment URL matches the target
   - Check Convex dashboard for deployment history

2. **Once deployment syncs**, Fireworks Kimi K2.5 will work immediately:
   - Use model ID: `accounts/fireworks/models/kimi-k2p5`
   - Native Fireworks SDK with proper tool calling support
   - Full agent capabilities (32 max steps)

3. **Alternative**: Use working models in current runtime:
   - X.AI Grok models (have API key)
   - TogetherAI GLM-4.7 (have API key)
   - Google models via AI SDK

## Files Modified (Ready to Deploy)
- `convex/agent.ts` - Fireworks native integration for Kimi K2.5
- `convex/testGLM47.ts` - Added `testKimiDirect` function
- `convex/testGateway.ts` - AI Gateway testing function
- `convex/chat.ts` - Updated validators and routing

## Deployment Commands Used
```bash
# From worktree
export CONVEX_DEPLOYMENT=prod:brilliant-ferret-250
pnpm convex deploy --yes

# From main directory
cd "/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz"
export CONVEX_DEPLOYMENT=prod:brilliant-ferret-250
pnpm convex deploy --yes
```

Both succeed but runtime doesn't update.
