# ChainWeather

ChainWeather is a Base MiniApp for onchain weather journaling, mood broadcasts, and community climate pulses.

Repository: https://github.com/TabNelson/chainweather.git

## Overview

ChainWeather lets users publish small weather and mood updates on Base mainnet.

The app focuses on three simple ideas:

- Record the current weather state.
- Share a mood alongside that weather state.
- Read recent weather data associated with a user address.

It is designed as a lightweight MiniApp with a clear onchain interaction model.

## Features

- Onchain weather journaling.
- Mood broadcasts paired with weather entries.
- Community climate pulse interactions.
- Read support for current weather by user address.
- Read support for weather history count by user address.
- Base mainnet contract integration.
- Base attribution support through app metadata and write data.

## Stack

- Next.js App Router
- TypeScript
- Wagmi
- Viem
- Base mainnet

## Contract

ChainWeather uses the following Base mainnet contract:

`0x43cf7e971879be966853ef6b811ab35Ccd99dbEf`

## Contract Functions Used

The app interacts with these contract functions:

- `setWeather(string state, string mood)`
- `pingWeather(string state, string mood)`
- `resetWeather()`
- `currentWeather(address user)`
- `historyCount(address user)`

## Project Structure

Key files referenced by the app include:

- `src/app/layout.tsx`
- `src/app/page.tsx`

`src/app/layout.tsx` contains the MiniApp metadata used for Base attribution.

`src/app/page.tsx` contains the primary page logic and contract write configuration.

## Base Attribution

Offchain attribution is configured in `src/app/layout.tsx`:

```tsx
<meta name="base:app_id" content="" />
```

After Base verification, replace the empty value with the issued app id and redeploy.

Onchain attribution is passed explicitly to each contract write through `dataSuffix` in `src/app/page.tsx`.

Set the final encoded builder code with:

```bash
NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX=0x...
```

The default placeholder is:

```bash
NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX=0x
```

Keep the placeholder until the final builder code is issued.

## Setup

Clone the repository:

```bash
git clone https://github.com/TabNelson/chainweather.git
cd chainweather
```

Install dependencies:

```bash
npm install
```

Create a local environment file if needed:

```bash
cp .env.example .env.local
```

If no example file is present, create `.env.local` manually.

Add the builder data suffix when it is available:

```bash
NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX=0x...
```

Before the builder code is issued, the value can remain:

```bash
NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX=0x
```

## Development

Start the local development server:

```bash
npm run dev
```

Open the local app in your browser:

```bash
http://localhost:3000
```

Use the app interface to submit weather and mood updates.

Make sure your connected wallet is using Base mainnet when interacting with the deployed contract.

## Usage

Use `setWeather` to save a weather state and mood.
