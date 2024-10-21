import BigNumber from 'bignumber.js'
import { TokenInfoFormatted, amount2Decimal } from 'iziswap-sdk/lib/base'
import { RegisteredSubscription } from 'web3/lib/commonjs/eth.exports'
import { erc20ABI } from './abi'
import Web3 from 'web3'

export const formatToDecimal = (bigNumber: any, tokenInfoFormatted: TokenInfoFormatted) => {
  return amount2Decimal(new BigNumber(bigNumber), tokenInfoFormatted)
}

export const approveTx = async (
  web3: Web3<RegisteredSubscription>,
  swapAddress: string,
  gasLimit: any,
  address1: string,
  address2: string
) => {
  const allAddress = [address1, address2]

  for (const address of allAddress) {
    const tokenAContract = new web3.eth.Contract(erc20ABI, address)
    const approveCalling = tokenAContract.methods.approve(swapAddress, '0xffffffffffffffffffffffffffffffff')
    await approveCalling.send({ gas: gasLimit })
  }
}
