# Protoface Quickstart for VideoSDK AI Agents

This quickstart is the easiest way to serve a Protoface Avatar connected to a VideoSDK AI Agent. Simply follow the steps listed below.

## About Protoface

Protoface adds a real-time avatar to your AI app or agent.

Get a **free** API key at [protoface.com](https://protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk).

Read the docs at [docs.protoface.com](https://docs.protoface.com/?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk).

To see quickstarts for other platforms, visit the [quickstart repo](https://github.com/protoface-ai/protoface-quickstart).

## Get Started

1. Copy `.env.example` for your local `.env` file and put in your Protoface API key, LiveKit secrets, and VideoSDK credentials.

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

2. Install the needed packages

```bash
npm install
```

3. Run the dev server and head to [the site](http://localhost:3000)

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

## Avatars

Find avatars you like or create your own on [the Protoface dashboard](https://app.protoface.com?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk). Replace the `.env` value for `NEXT_PUBLIC_PROTOFACE_AVATAR_ID` to swap the stock avatar with one of your choosing.

Alternatively, find the API spec for creating, retrieving, and maintaing avatars at [docs.protoface.com](https://docs.protoface.com/guides/avatars?utm_source=github&utm_medium=referral&utm_campaign=github_docs&utm_content=protoface-quickstart-videosdk).

## Protoface: More Quickstarts

Protoface integrates with popular voice AI platforms.

Clone a starter repo, add your keys to the environment file, and run.

If an SDK or plugin is available separately, we've linked to it instead.

| Platform | Link |
| --- | --- |
| LiveKit | [Plugin](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-protoface) [Official Docs](https://docs.pipecat.ai/api-reference/server/services/video/protoface)|
| Pipecat | [Plugin](https://github.com/protoface-ai/protoface-plugin-pipecat) [Official Docs](https://docs.pipecat.ai/api-reference/server/services/video/protoface)|
| Agora | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-agora) |
| Vapi | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-vapi) |
| ElevenLabs Agents | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-elevenlabs-agents) |
| OpenAI Realtime | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-openai-realtime) |
| VideoSDK | [Starter Repo](https://github.com/protoface-ai/protoface-quickstart-videosdk) |
| Python | [SDK](https://github.com/protoface-ai/protoface-sdk-python) |
| Node.js | [SDK](https://github.com/protoface-ai/protoface-sdk-node) |

