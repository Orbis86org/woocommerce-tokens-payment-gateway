import React, {useEffect, useState} from "react";
import {IWallet, IWallets} from './etaswap/models';
import {Token} from './etaswap/types/token.js';
// @ts-ignore
import HashpackIcon from './etaswap/assets/img/hashpack-icon.png';
// @ts-ignore
import HashpackLogo from './etaswap/assets/img/hashpack.svg';
// @ts-ignore
import KabilaIcon from './etaswap/assets/img/kabila-icon.svg';
// @ts-ignore
import KabilaLogo from './etaswap/assets/img/kabila-logo.svg';
// @ts-ignore
import BladeIcon from './etaswap/assets/img/blade-icon.webp';
// @ts-ignore
import BladeLogo from './etaswap/assets/img/blade.svg'
// @ts-ignore
import WalletConnectIcon from './etaswap/assets/img/wallet-connect-icon.svg';
// @ts-ignore
import WalletConnectLogo from './etaswap/assets/img/wallet-connect.svg';

import {API, MIRRORNODE, PROVIDERS} from './etaswap/config.js';
import axios from 'axios';
import Swap from './etaswap/pages/Swap/Swap.js';
import {Modal} from "antd";
import {WalletConnectContextProvider} from "../contexts/WalletConnectContext";
import './etaswap/index.css';
import {useToaster} from "./etaswap/components/Toaster/ToasterContext";
import {WalletConnect} from "./etaswap/class/wallet/wallet-connect";
import {ConnectWalletModal} from "./etaswap/components/Header/components/ConnectWalletModal";

const walletConnect = new WalletConnect();

function SwapReactApp({open, handleClose}) {
	const [wallet, setWallet] = useState<IWallet>({
		name: '',
		address: '',
		signer: null,
	});
	const [tokens, setTokens] = useState<Token[]>([]);
	const [rate, setRate] = useState<number | null>(null);
	const [walletModalOpen, setWalletModalOpen] = useState(false);

	const [wallets, setWallets] = useState<IWallets>({
		/*blade: {
			name: 'blade',
			title: 'Blade',
			instance: new BladeWallet(setWallet),
			image: BladeLogo,
			icon: BladeIcon,
		}*/
	});
	const [providers] = useState(PROVIDERS);
	const { showToast } = useToaster();

	const disconnectWallet = (name: string) => {
		wallets[name].instance.disconnect();
	}

	const connectWallet = (name: string) => {
		if (wallet.address) {
			if (wallet.name === name) {
				return null;
			}
			wallets[wallet.name].instance.disconnect();
		}
		wallets[name].instance.connect(false, wallets[name].extensionId);
		setWalletModalOpen(false);
	}

	useEffect(() => {
		if(wallet.address && wallets?.[wallet.name]?.instance?.updateBalance){
			wallets[wallet.name].instance.updateBalance();
		}
	}, [wallet.address]);

	useEffect(() => {
		walletConnect.init(setWallet).then(extensionData => {
			const walletConnectWallets: IWallets = {};
			extensionData.forEach(extension => {
				if (extension.id === 'cnoepnljjcacmnjnopbhjelpmfokpijm') {
					walletConnectWallets.kabila = {
						name: 'kabila',
						title: extension.name || 'Kabila',
						instance: walletConnect,
						image: KabilaLogo,
						icon: KabilaIcon,
						extensionId: extension.id,
					};
				}
				if (extension.id === 'gjagmgiddbbciopjhllkdnddhcglnemk') {
					walletConnectWallets.hashpack = {
						name: 'hashpack',
						title: extension.name || 'HashPack',
						instance: walletConnect,
						image: HashpackLogo,
						icon: HashpackIcon,
						extensionId: extension.id,
					};
				}
			});
			walletConnectWallets.walletConnect = {
				name: 'walletConnect',
				title: 'WalletConnect',
				instance: walletConnect,
				image: WalletConnectLogo,
				icon: WalletConnectIcon,
			};
			setWallets({
				...walletConnectWallets,
				...wallets,
			})
		});
	}, []);

	useEffect(() => {
		Promise.all([
			axios.get(`${MIRRORNODE}/api/v1/network/exchangerate`),
			axios.get(`${API}/tokens`)
		]).then(([rate, tokens]) => {
			setRate(rate.data.current_rate.hbar_equivalent / rate.data.current_rate.cent_equivalent * 100);
			setTokens(tokens.data);
		});
	}, []);


	return (
		<>
			<Modal
				title={null}
				open={ open }
				onOk={handleClose}
				onCancel={handleClose}
				footer={ null }
				zIndex={ 1 }
				className='wctg-swap-modal'
			>
				<Swap
					wallet={wallet}
					tokens={tokens}
					rate={rate}
					providers={providers}
					setWalletModalOpen={setWalletModalOpen}
				>

				</Swap>
			</Modal>
			<ConnectWalletModal
				connectWallet={connectWallet}
				walletModalOpen={walletModalOpen}
				wallets={wallets}
				setWalletModalOpen={setWalletModalOpen}
			/>
		</>

	)
}

export default SwapReactApp;

export function SwapPopupProvider() {
	const [open, setOpen] = useState(true );

	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	return (
		<WalletConnectContextProvider>
			<SwapReactApp open={open} handleClose={handleToggle} />
		</WalletConnectContextProvider>

	);
}