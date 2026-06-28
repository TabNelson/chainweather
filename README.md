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
