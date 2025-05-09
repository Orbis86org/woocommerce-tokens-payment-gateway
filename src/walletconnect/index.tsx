import React from "react";
import {createWeb3Modal} from '@web3modal/wagmi/react'
import {defaultWagmiConfig} from '@web3modal/wagmi/react/config'

import {WagmiProvider} from 'wagmi'
import {hederaTestnet} from 'wagmi/chains'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Your WalletConnect Cloud project ID
const projectId = window?.wctg_vars?.wallet_connect_project_id || '';
const siteUrl = window?.wctg_vars?.site_url || '';
const siteName = window?.wctg_vars?.site_name || '';


// 2. Create wagmiConfig
const metadata = {
    name: siteName,
    description: '',
    url: siteUrl, // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [hederaTestnet] as const
export const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
})

// 3. Create modal
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
    enableOnramp: true // Optional - false as default
})

export function Web3ModalProvider({ children }) {

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}
