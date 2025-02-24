import axios from "axios"

export async function convertTokensToHbar (amount, token) {
    try {
        const response = await axios.post('https://api.saucerswap.finance/swap', {
            fromToken: token,
            toToken: "HBAR",
            amount: amount
        });

        if (response.data.success) {
            console.log(`Successfully swapped ${amount} ${token} to HBAR.`);
            return true;
        } else {
            console.log(`Failed to swap tokens: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        console.error(`Error occurred during token swap: ${error}`);
        return false;
    }
}

