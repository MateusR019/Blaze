(() => {
    const WALLET_EVENT_NAME = "blazeWalletChange";

    const formatAddress = (pubkey) => {
        const address = typeof pubkey === "string" ? pubkey : pubkey?.toString?.();
        if (!address) {
            return "";
        }
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    const emitWalletChange = (detail) => {
        window.dispatchEvent(new CustomEvent(WALLET_EVENT_NAME, { detail }));
    };

    const setGlobalWallet = (info) => {
        if (!info) {
            window.blazeWallet = null;
            emitWalletChange({ connected: false });
            return;
        }

        window.blazeWallet = {
            provider: info.provider,
            name: info.name,
            publicKey: info.publicKey,
            address: info.address
        };

        emitWalletChange({
            connected: true,
            provider: info.provider,
            name: info.name,
            publicKey: info.publicKey,
            address: info.address
        });
    };

    const detectProvider = () => {
        if (window.backpack?.solana?.isBackpack) {
            return { name: "Backpack", provider: window.backpack.solana };
        }

        if (window.solana?.isPhantom) {
            return { name: "Phantom", provider: window.solana };
        }

        if (window.phantom?.solana?.isPhantom) {
            return { name: "Phantom", provider: window.phantom.solana };
        }

        return null;
    };

    const setupWalletConnect = () => {
        const button = document.getElementById("connect-wallet");
        const messageEl = document.getElementById("wallet-message");
        const copyButtons = document.querySelectorAll(".wallet-copy");

        if (!button) {
            return;
        }

        setGlobalWallet(null);

        const setMessage = (text) => {
            if (messageEl) {
                messageEl.textContent = text;
            }
        };

        let activeProviderInfo = null;

        const attachAccountListener = (provider, name) => {
            if (typeof provider?.on !== "function") {
                return;
            }

            provider.on("accountChanged", (account) => {
                if (!account) {
                    button.disabled = false;
                    button.textContent = "Connect Wallet";
                    setMessage("Wallet desconectada. Clique para conectar novamente.");
                    activeProviderInfo = null;
                    setGlobalWallet(null);
                    return;
                }

                const address = formatAddress(account);
                setMessage(`Wallet conectada (${name}): ${address}`);
                setGlobalWallet({
                    provider,
                    name,
                    publicKey: account?.toString?.() ?? account,
                    address
                });
            });
        };

        const eagerConnect = async () => {
            const providerInfo = detectProvider();
            if (!providerInfo) {
                return;
            }

            try {
                const response = await providerInfo.provider.connect({ onlyIfTrusted: true });
                if (response?.publicKey) {
                    const address = formatAddress(response.publicKey);
                    activeProviderInfo = providerInfo;
                    button.disabled = true;
                    button.textContent = "Wallet conectada";
                    setMessage(`Wallet conectada (${providerInfo.name}): ${address}`);
                    setGlobalWallet({
                        provider: providerInfo.provider,
                        name: providerInfo.name,
                        publicKey: response.publicKey?.toString?.() ?? response.publicKey,
                        address
                    });
                    attachAccountListener(providerInfo.provider, providerInfo.name);
                }
            } catch (error) {
                // Usuario nao autorizou conexao automatica, seguimos normalmente.
            }
        };

        const handleClick = async () => {
            const providerInfo = detectProvider();
            if (!providerInfo) {
                setMessage("Instale Phantom (https://phantom.app) ou Backpack (https://www.backpack.app) e recarregue a pagina.");
                return;
            }

            button.disabled = true;
            setMessage("Solicitando conexao...");

            try {
                const response = await providerInfo.provider.connect();
                if (response?.publicKey) {
                    const address = formatAddress(response.publicKey);
                    activeProviderInfo = providerInfo;
                    button.textContent = "Wallet conectada";
                    setMessage(`Wallet conectada (${providerInfo.name}): ${address}`);
                    setGlobalWallet({
                        provider: providerInfo.provider,
                        name: providerInfo.name,
                        publicKey: response.publicKey?.toString?.() ?? response.publicKey,
                        address
                    });
                    attachAccountListener(providerInfo.provider, providerInfo.name);
                } else {
                    button.disabled = false;
                    setMessage("Nao foi possivel obter a chave publica da wallet.");
                }
            } catch (error) {
                button.disabled = false;
                setMessage(error?.message === "User rejected the request."
                    ? "Conexao cancelada pelo usuario."
                    : "Falha ao conectar. Verifique a extensao e tente novamente.");
            }
        };

        button.addEventListener("click", handleClick);
        eagerConnect();

        copyButtons.forEach((copyBtn) => {
            copyBtn.addEventListener("click", () => {
                const value = copyBtn.dataset.wallet;
                if (!value) {
                    return;
                }
                navigator.clipboard.writeText(value).then(() => {
                    const original = copyBtn.textContent ?? "Copiar";
                    copyBtn.textContent = "Copiado!";
                    setTimeout(() => {
                        copyBtn.textContent = original;
                    }, 2000);
                }).catch(() => {
                    copyBtn.textContent = "Erro";
                    setTimeout(() => {
                        copyBtn.textContent = "Copiar";
                    }, 2000);
                });
            });
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupWalletConnect);
    } else {
        setupWalletConnect();
    }
})();
