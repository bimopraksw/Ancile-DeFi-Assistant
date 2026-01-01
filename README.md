# Ancile ⛨

> *"As Talos guarded the island of Crete, Ancile is the sacred shield that fell from the heavens to protect the city of Rome. As long as this shield exists, Rome shall never fall."*

**Ancile** is the ultimate security guardian for your crypto assets. A natural language DeFi interface that combines elegance with rock-solid protection.

## Philosophy

The name **Ancile** comes from ancient Roman mythology - a sacred shield that fell from the sky as a divine gift to protect Rome. Just as the original Ancile was the ultimate symbol of protection for an entire civilization, our Ancile serves as the divine guardian of your digital assets.

- 🛡️ **Ultimate Security** - Every transaction requires explicit user approval
- ✨ **Elegant Interface** - Classic design meets modern glassmorphism
- 🔮 **Natural Language** - Simply describe what you want to do
- ⚡ **Multi-Chain Support** - Ethereum, Base, Arbitrum, Optimism, Polygon, and more

## Features

- **Natural Language DeFi** - Swap tokens, check balances, and more using plain English
- **Multi-Step Operations** - Handle complex requests like "Check my balance and swap half for USDC"
- **Wallet Integration** - Supports MetaMask, Rabby, Phantom, Backpack, and all EIP-6963 wallets
- **Transaction Safety** - Two-step confirmation process for all transactions
- **Real-Time Feedback** - Live transaction status and confirmation tracking

## Getting Started

### Prerequisites

- Node.js 18+
- A Web3 wallet (MetaMask, Rabby, Phantom, etc.)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ancile.git
cd ancile

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Ancile in action.

## Usage Examples

```
"Swap 100 USDC for ETH on Base"
"Check my ETH balance on Ethereum"
"What's my USDC balance across all chains?"
"Swap half of my ETH for USDC on Arbitrum"
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **AI**: Vercel AI SDK with OpenAI
- **Blockchain**: Wagmi v3 + Viem
- **Styling**: Tailwind CSS with Glassmorphism
- **Testing**: Vitest with Property-Based Testing (fast-check)

## Security

Ancile prioritizes security above all else:

- ✅ No automatic transaction execution
- ✅ Explicit wallet signature required for every transaction
- ✅ Input validation and sanitization
- ✅ Rate limiting and error handling
- ✅ Transaction parameter validation

## Author

Created by **oxblurryface** ⚡

## Support the Project

If you find Ancile useful and want to support its development, you can send a donation to:

```
0xfcf5e7ce37238b4270e953bbfb611d2087b44a99
```

Accepts ETH and tokens on Ethereum, Base, Arbitrum, Optimism, Polygon, and other EVM chains. 🙏

## License

MIT

---

*"While the shield stands, your assets are protected."* ⛨
