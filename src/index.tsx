import ReactDOM from "react-dom/client";
import React, {useEffect, useState} from "react";

import ConnectWallet from "./ConnectWallet";
import { PopupProvider } from "./popup/PaymentPopup"
import Liquidity from './saucerswap/liquidity'
import {AllWalletsProvider} from "./services/wallets/AllWalletsProvider";

const root = ReactDOM.createRoot(document.getElementById("wctg-wallet-connect"));
root.render(
    <AllWalletsProvider>
        <ConnectWallet />
    </AllWalletsProvider>

);

/**
 * Payment Popup Shown After Clicking make Payment
 */
function renderReactApp() {
    const rootElement = document.getElementById("payment-container" );
    if (rootElement) {
        const popup_root = ReactDOM.createRoot(rootElement);
        popup_root.render(
            <AllWalletsProvider>
                <PopupProvider />
            </AllWalletsProvider>
        );
    }
}

// Add event listener to the place order button
// Add event listener to WooCommerce events that trigger when the checkout buttons are enabled again

// Function to attach the click event listener
jQuery(document).ready(function($) {
    // Function to attach the event to the button
    function attachMakePaymentButtonEvent() {
        // Remove any previous click event attached to the button to avoid duplicates
        $('form.checkout').off('click', '#renderButton');

        // Use event delegation to listen for clicks on the button via the parent form element
        $('form.checkout').on('click', '#renderButton', function(e) {
            e.preventDefault(); // Prevent WooCommerce form submission

            // Call your React-based popup function here
            renderReactApp();
        });
    }

    // Attach the event handler when the document is ready
    attachMakePaymentButtonEvent();

    // Reattach the event handler whenever a payment method is changed
    $('form.checkout').on('change', 'input[name="payment_method"]', function() {
        attachMakePaymentButtonEvent();
    });
});

