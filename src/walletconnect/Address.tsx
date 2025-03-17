import React, {useEffect} from "react";

import {useAccount} from 'wagmi'

export function Address() {
    const { address, isConnecting, isDisconnected } = useAccount()

    useEffect( () => {
        if( address ){
            // console.log( 'The current connected wallet address is: ', address );
        }
    }, [ address ]);

    return (
        <></>
    )
}
