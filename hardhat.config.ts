import '@xyrusworx/hardhat-solidity-json';
import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';
import * as dotenv from "dotenv";
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';

dotenv.config();
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY != undefined ? process.env.ADMIN_PRIVATE_KEY:""
const TOKEN_ISSUER_KEY = process.env.TOKEN_ISSUER_KEY != undefined ? process.env.TOKEN_ISSUER_KEY:""
const TOKEN_AGENT_KEY = process.env.TOKEN_AGENT_KEY != undefined ? process.env.TOKEN_AGENT_KEY:""
const TOKEN_ADMIN_KEY = process.env.TOKEN_ADMIN_KEY != undefined ? process.env.TOKEN_ADMIN_KEY:""
const CLAIM_ISSUER_KEY = process.env.CLAIM_ISSUER_KEY != undefined ? process.env.CLAIM_ISSUER_KEY:""
const ALICE_KEY = process.env.ALICE_KEY != undefined ? process.env.ALICE_KEY:""
const BOB_KEY = process.env.BOB_KEY != undefined ? process.env.BOB_KEY:""
const CHARLIE_KEY = process.env.CHARLIE_KEY != undefined ? process.env.CHARLIE_KEY:""
const CLAIM_ISSUER_SIGNING_KEY = process.env.CLAIM_ISSUER_SIGNING_KEY != undefined ? process.env.CLAIM_ISSUER_SIGNING_KEY:""
const ALICE_ACTION_KEY = process.env.ALICE_ACTION_KEY != undefined ? process.env.ALICE_ACTION_KEY:""

const INFURA_SEPOLIA_API_KEY = process.env.INFURA_SEPOLIA_API_KEY != undefined ? process.env.INFURA_SEPOLIA_API_KEY:""

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks:{
    hardhat:{
      initialBaseFeePerGas:0,
      gasPrice:0,
      chainId:1337,
      accounts:{
        count:20,
      },
    },

    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_SEPOLIA_API_KEY}`,
      accounts: [ADMIN_PRIVATE_KEY, TOKEN_ISSUER_KEY, TOKEN_AGENT_KEY, TOKEN_ADMIN_KEY, CLAIM_ISSUER_KEY, ALICE_KEY, BOB_KEY, CHARLIE_KEY, CLAIM_ISSUER_SIGNING_KEY, ALICE_ACTION_KEY],
    },
  },
  gasReporter: {
    enabled: true,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
};

export default config;
