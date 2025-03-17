import ReactDOM from "react-dom/client";
import React from "react";

import ConnectWallet from "./ConnectWallet";
import {PopupProvider} from "./popup/PaymentPopup"
import {AllWalletsProvider} from "./services/wallets/AllWalletsProvider";
import {SwapPopupProvider} from "./saucerswap/SwapReactApp";
import {ToasterProvider} from "./saucerswap/etaswap/components/Toaster/ToasterContext";

import {LoaderProvider} from "./saucerswap/etaswap/components/Loader/LoaderContext";


const container = document.getElementById("wctg-wallet-connect");
if (container) {
    // The element exists; safe to render
    const root = ReactDOM.createRoot(container);
    root.render(
        <AllWalletsProvider>
            <ConnectWallet />
        </AllWalletsProvider>
    );
} else {
    // The element doesn't exist; handle gracefully
    // console.warn("Element #wctg-wallet-connect not found on the page.");
}

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


/**
 * Admin Area script
 *
 * Shown on orders page
 */
function renderSwapReactApp() {
    const rootElement = document.getElementById("swap-container" );

    if (rootElement) {
        const popup_root = ReactDOM.createRoot(rootElement);
        popup_root.render(
            <AllWalletsProvider>
                <ToasterProvider>
                    <LoaderProvider>
                        <SwapPopupProvider />
                    </LoaderProvider>
                </ToasterProvider>
            </AllWalletsProvider>
        );
    }
}
// Function to attach the click event listener
jQuery(document).on('click', '#wctg-swap-token-btn', function(e) {
    e.preventDefault();

    renderSwapReactApp();
});


