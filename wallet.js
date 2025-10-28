(() => {
    const formatAddress = (pubkey) => {
        const address = typeof pubkey === "string" ? pubkey : pubkey?.toString?.();
        if (!address) {
            return "";
        }
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
        if (!button || !messageEl) {
            return;
        }

        const setMessage = (text) => {
            messageEl.textContent = text;
        };

        let activeProviderInfo = null;

        const attachAccountListener = (provider, name) => {
            if (typeof provider?.on !== "function") {
                return;
            }

            provider.on("accountChanged", (account) => {
                if (!account) {
                    button.disabled = false;
                    button.textContent = "Conectar wallet Solana";
                    setMessage("Wallet desconectada. Clique para conectar novamente.");
                    activeProviderInfo = null;
                    return;
                }

                setMessage(`Wallet conectada (${name}): ${formatAddress(account)}`);
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
                    activeProviderInfo = providerInfo;
                    button.disabled = true;
                    button.textContent = "Wallet conectada";
                    setMessage(`Wallet conectada (${providerInfo.name}): ${formatAddress(response.publicKey)}`);
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
                    activeProviderInfo = providerInfo;
                    button.textContent = "Wallet conectada";
                    setMessage(`Wallet conectada (${providerInfo.name}): ${formatAddress(response.publicKey)}`);
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
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupWalletConnect);
    } else {
        setupWalletConnect();
    }
})();
