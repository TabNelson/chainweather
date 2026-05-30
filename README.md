# ChainWeather

ChainWeather is a Base MiniApp for onchain weather journaling, mood broadcasts, and community climate pulses.

## Stack

- Next.js App Router
- TypeScript
- Wagmi
- Viem
- Base mainnet

## Base Attribution

Offchain attribution is hardcoded in `src/app/layout.tsx`:

```tsx
<meta name="base:app_id" content="" />
```

After base.dev verification, replace the empty value with the issued app id and redeploy.

Onchain attribution is passed explicitly to each contract write through `dataSuffix` in `src/app/page.tsx`. Set the final encoded builder code with:

```bash
NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX=0x...
```

The default placeholder is `0x` until the builder code is issued.

## Contract

`0x43cf7e971879be966853ef6b811ab35Ccd99dbEf`

Functions used:

- `setWeather(string state, string mood)`
- `pingWeather(string state, string mood)`
- `resetWeather()`
- `currentWeather(address user)`
- `historyCount(address user)`

