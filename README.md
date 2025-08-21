# Izumi Finance Trailblazers Taiko Airdrop bot

A loyalty program designed for everyone to learn and get rewarded (Airdrop) by exploring every corner of our ecosystem and completing various on-chain activities. This bot also includes an automatic swap feature on iZUMi Finance Exchange using the `Swap` `Wrap` `Un-Wrap` method, allowing seamless token swaps as part of the reward and exploration process.

Automate the swapping of WETH to USDC.

## Requirements

- Node.js
- Private keys for the wallets you intend to use (stored in `.env`).
- Token ETH Taiko Network
- Token WETH Taiko Network

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/frankrichardhall/Izumi-Finance-Trailblazers-Taiko-Airdrop-bot.git
   cd Izumi-Finance-Trailblazers-Taiko-Airdrop-bot
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

   ```
   npm install -g ts-node
   ```

3. **Create `privateKeys.json`**:
   Move a file named `.env.example` to `.env` in the root directory with the following format:

   ```json
    PRIVATE_KEY="0xYourPrivateKey"
   ```

4. **Run the Bot**:

   ```bash
   npm start
   ```

## Usage

- Use `npm start` to check the menu options available.
- Use `npm trade` to use Trade.
- Use `npm wrap` to use Wrap.
- Choose the appropriate command based on the network you want to use.
- The bot will automatically execute the transactions, handling any errors and retrying as needed.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
 
 
 
 
 
 
 
 
 
 
 
 
 
 
