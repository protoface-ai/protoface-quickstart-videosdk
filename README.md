# Protoface Quickstart for VideoSDK AI Agents

This quickstart shows how to run a Protoface avatar in a Next.js app with a VideoSDK AI agent.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Usage

1. Rename `.env.example` to `.env` and paste your Protoface API key, LiveKit secrets, and VideoSDK credentials.

```js
PROTOFACE_API_KEY="PROTOFACE-API-KEY"
LIVEKIT_URL="wss://YOUR-LIVEKIT-PROJECT.livekit.cloud"
LIVEKIT_API_KEY="LIVEKIT-API-KEY"
LIVEKIT_API_SECRET="LIVEKIT-API-SECRET"

VIDEOSDK_API_KEY="VIDEOSDK-API-KEY"
VIDEOSDK_SECRET="VIDEOSDK-SECRET"
VIDEOSDK_AGENT_ID="VIDEOSDK-AGENT-ID"
VIDEOSDK_AGENT_VERSION_TAG="" // Optional
NEXT_PUBLIC_PROTOFACE_AVATAR_ID="av_stock_001" // Optional
```

2. Install packages and link the local Protoface client.

```bash
npm install
npm link ../protoface-client
```

3. Run the app.

```bash
npm run dev
```

## How It Works

The app generates VideoSDK access tokens on the server, starts a VideoSDK room, dispatches your configured VideoSDK AI agent, and starts a Protoface avatar session:

1. The server signs VideoSDK JWTs from `VIDEOSDK_API_KEY` and `VIDEOSDK_SECRET`.
2. The server creates a VideoSDK room with `POST /v2/rooms`.
3. The server dispatches the configured AI agent with `POST /v2/agent/dispatch`.
4. The browser joins the VideoSDK room with `@videosdk.live/react-sdk` and publishes microphone audio.
5. `ProtofaceClient.start()` connects the browser to the avatar session.
6. The app passes the VideoSDK agent's realtime speech track to Protoface so the avatar speaks naturally.

Protoface is the visible and audible avatar output for the experience.

## Characters

You can swap out the character by finding one that you like in the [Protoface avatar docs](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk), or create your own.

`av_stock_001` `av_stock_002` `av_stock_003` `custom_avatar_id`

## Deploy on Vercel

An easy way to deploy your avatar interaction is to use the [Vercel Platform](https://vercel.com/new?filter=next.js).
