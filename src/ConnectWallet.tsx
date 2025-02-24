import React, {useContext, useEffect, useState} from "react";

import {openWalletConnectModal} from "./services/wallets/walletconnect/walletConnectClient";
import {useWalletInterface} from "./services/wallets/useWalletInterface";
import {WalletConnectContext} from "./contexts/WalletConnectContext";
import {Button} from "antd";


export default function ConnectWallet() {

    // Wait for the modal to render
    const interval = setInterval(() => {
        const shadowHost = document.querySelector('wcm-modal');
        if (shadowHost && shadowHost.shadowRoot) {
            const shadowRoot = shadowHost.shadowRoot;
            const targetElement = shadowRoot.querySelector('#wcm-modal');

            if (targetElement) {
                // Inject styles into the shadow root
                const style = document.createElement('style');
                style.textContent = `
                #wcm-modal {
                    z-index: 99999 !important;
                }
            `;
                shadowRoot.appendChild(style);
                clearInterval(interval); // Stop checking once the styles are applied
            }
        }
    }, 100); // Check every 100ms


    // use the HashpackContext to keep track of the hashpack account and connection
    const { setAccountId } = useContext( WalletConnectContext )
    const { accountId, walletInterface } = useWalletInterface();
    useEffect(() => {
        const account_id = localStorage.getItem( 'hederaAccountId' );

        if( account_id ){
            setAccountId( account_id );
        }
    }, [])


    /**
     * Connect Wallet
     */
    const [connectingWallet, setConnectingWallet] = useState( false );


    return (
            <Button
                className='wctg-btn'
                loading={ connectingWallet }
                onClick={async function () {
                    setConnectingWallet( true );

                    if (accountId) {
                        try{
                            walletInterface.disconnect();
                        }catch ( e ){

                        }

                        setConnectingWallet( false );
                    } else {
                        const connected = await openWalletConnectModal();

                        setConnectingWallet( false );
                    }
                }}
            >
                {accountId ? `${accountId}` :
                    'Connect Wallet'
                }
            </Button>
    )
}