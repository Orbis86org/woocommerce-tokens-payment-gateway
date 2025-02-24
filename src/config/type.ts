export type NetworkName = ['testnet', 'mainnet']
export type NetworkConfig = {
  network: NetworkName,
  jsonRpcUrl: string,
  mirrorNodeUrl: string,
  chainId: string,
}

// purpose of this file is to define the type of the config object
export type NetworkConfigs = {
  [key in NetworkName]: {
    network: string,
    jsonRpcUrl: string,
    mirrorNodeUrl: string,
    chainId: string,
  }
};

export type AppConfig = {
  networks: NetworkConfigs,
}
