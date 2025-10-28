const NFT_COLLECTIONS = [
    {
        name: "Founders Badge",
        mint: "INSERT_FOUNDERS_BADGE_MINT",
        description: "NFT que garante a tag [FUNDADOR] e prioridade em eventos."
    },
    {
        name: "Nether Utilities",
        mint: "INSERT_NETHER_UTILITIES_MINT",
        description: "Cosmeticos e utilidades sem pay-to-win."
    },
    {
        name: "Community Nodes",
        mint: "INSERT_COMMUNITY_NODES_MINT",
        description: "Governanca e acesso a dashboards on-chain."
    }
];

const SOLANA_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

const prettyMint = (mint) => {
    if (!mint || mint.startsWith("INSERT_")) {
        return "Mint pendente";
    }
    return mint.slice(0, 4) + "..." + mint.slice(-4);
};

const fetchHolding = async (owner, mint) => {
    if (!mint || mint.startsWith("INSERT_")) {
        return { found: false, note: "Mint ainda nao publicado." };
    }

    const body = {
        jsonrpc: "2.0",
        id: `holder-check-${mint}`,
        method: "getTokenAccountsByOwner",
        params: [
            owner,
            { mint },
            { encoding: "jsonParsed" }
        ]
    };

    const response = await fetch(SOLANA_RPC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`RPC status ${response.status}`);
    }

    const json = await response.json();
    const accounts = json?.result?.value ?? [];
    const holdingAccounts = accounts.filter((account) => {
        const amount = account?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
        return amount > 0;
    });

    return { found: holdingAccounts.length > 0 };
};

const buildResultMessage = (wallet, results) => {
    const connected = wallet?.publicKey;
    if (!connected) {
        return "Nenhuma wallet conectada. Clique em Connect Wallet no topo e tente novamente.";
    }

    const lines = [`Wallet: ${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}`];

    results.forEach((result) => {
        const status = result.error
            ? `Erro ao consultar (${result.error}).`
            : result.note
                ? result.note
                : result.found
                    ? "✅ Holder confirmado."
                    : "❌ Ainda nao possui.";

        lines.push(`• ${result.name} (${prettyMint(result.mint)}): ${status}`);
    });

    return lines.join("\n");
};

const checkHolderButton = document.getElementById("check-holder");
const holderResult = document.getElementById("holder-result");

const getWalletInfo = () => {
    const wallet = window.blazeWallet;
    if (!wallet?.publicKey) {
        return null;
    }

    return {
        provider: wallet.provider,
        name: wallet.name,
        publicKey: wallet.publicKey
    };
};

const runHolderCheck = async () => {
    const wallet = getWalletInfo();
    if (!wallet) {
        holderResult.textContent = "Conecte sua wallet Solana com Phantom ou Backpack e tente novamente.";
        return;
    }

    holderResult.textContent = "Consultando on-chain. Isso pode levar alguns segundos...";

    const results = [];
    for (const nft of NFT_COLLECTIONS) {
        try {
            const holding = await fetchHolding(wallet.publicKey, nft.mint);
            results.push({ ...nft, ...holding });
        } catch (error) {
            results.push({ ...nft, error: error.message });
        }
    }

    holderResult.textContent = buildResultMessage(wallet, results);
};

if (checkHolderButton && holderResult) {
    checkHolderButton.addEventListener("click", runHolderCheck);
}

window.addEventListener("blazeWalletChange", (event) => {
    if (!holderResult) {
        return;
    }

    const detail = event.detail;
    if (!detail?.publicKey) {
        holderResult.textContent = "Wallet desconectada. Clique em Connect Wallet no topo para verificar novamente.";
    } else {
        holderResult.textContent = "Wallet conectada. Clique em Verificar holder para checar os NFTs.";
    }
});
