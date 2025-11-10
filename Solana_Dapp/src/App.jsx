import { useState, useContext, createContext } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui'
import { 
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter
} from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'
import { RequestAirdrop } from './RequestAirdrop'
import { ShowBalance } from './ShowBalance'
import { SignMessage } from './SignMessage'
import { SendSol } from './SendSol'
import { useWallet } from '@solana/wallet-adapter-react'
import './App.css'

// Theme Context
const ThemeContext = createContext()

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light')

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div className={theme}>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => {
    const { theme, toggleTheme } = useContext(ThemeContext)
    const menuItems = [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'airdrop', label: 'Request Airdrop', icon: '⚡' },
        { id: 'send', label: 'Send SOL', icon: '✈️' },
        { id: 'sign', label: 'Sign & Verify', icon: '📝' },
        { id: 'about', label: 'About', icon: 'ℹ️' }
    ]

    return (
        <div className="w-full sm:w-64 min-h-screen max-h-screen p-0 flex-shrink-0 max-w-full">
            <div className="p-4 font-bold text-lg bg-blue-600 text-white dark:bg-blue-900">
                Solana Voting System
            </div>
            <nav className="mt-0">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                            activeTab === item.id
                                ? 'bg-gray-700 text-white border-l-4 border-blue-500 dark:bg-gray-800'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        <span className="hidden sm:inline">{item.label}</span>
                    </button>
                ))}
                <button
                    onClick={toggleTheme}
                    className="w-full text-left p-4 flex items-center gap-3 transition-colors text-gray-300 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800"
                >
                    <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
                    <span className="hidden sm:inline">{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
                </button>
            </nav>
        </div>
    )
}

// Main Content Component
const MainContent = ({ activeTab }) => {
    const { connected, publicKey } = useWallet()
    const { theme } = useContext(ThemeContext)

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <HomePage />
            case 'airdrop':
                return <RequestAirdrop />
            case 'send':
                return <SendSol />
            case 'sign':
                return <SignMessage />
            case 'about':
                return <AboutPage />
            default:
                return <HomePage />
        }
    }

    return (
        <div className="flex-1 min-h-screen max-h-screen h-full w-full max-w-full overflow-auto flex-shrink">
            {/* Header */}
            <div className="shadow-sm border-b p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        {connected ? (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">💰</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-200">Wallet Connected</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Your wallet is successfully connected</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">💳</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-200">Wallet Disconnected</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Please connect your wallet</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200">
                            <span>📤</span>
                            Upload Data
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                            Create Transaction
                        </button>
                    </div>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded dark:bg-green-900 dark:text-green-200">Connected</span>
                            <span className="text-sm font-mono text-gray-700 truncate max-w-[150px] sm:max-w-full dark:text-gray-300">
                                {publicKey?.toString()}
                            </span>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            📋
                        </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <WalletMultiButton className="!bg-purple-600 !border-0 !rounded-lg !px-4 !py-2 !text-white !text-sm" />
                        <WalletDisconnectButton className="!bg-white !border !rounded-lg !px-4 !py-2 !text-gray-700 !text-sm dark:!bg-gray-900 dark:!border-gray-600 dark:!text-gray-300" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 sm:p-6">
                {renderContent()}
            </div>
        </div>
    )
}

// Home Page Component
const HomePage = () => {
    return (
        <div className="max-w-full sm:max-w-4xl mx-auto max-h-screen">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {/* Service Cards */}
                <div className="rounded-lg p-4 sm:p-6 shadow-sm border bg-white dark:bg-gray-800 dark:border-gray-700">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 dark:bg-green-900">
                        <span className="text-2xl">⚡</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-gray-200">Request SOL</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base dark:text-gray-400">Get SOL tokens instantly from devnet faucet</p>
                    <button className="text-green-600 font-medium flex items-center gap-1 text-sm sm:text-base dark:text-green-400">
                        Get Started <span>→</span>
                    </button>
                </div>

                <div className="rounded-lg p-4 sm:p-6 shadow-sm border bg-white dark:bg-gray-800 dark:border-gray-700">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 dark:bg-blue-900">
                        <span className="text-2xl">✈️</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-gray-200">Send SOL</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base dark:text-gray-400">Transfer SOL to other wallets securely</p>
                    <button className="text-green-600 font-medium flex items-center gap-1 text-sm sm:text-base dark:text-green-400">
                        Get Started <span>→</span>
                    </button>
                </div>

                <div className="rounded-lg p-4 sm:p-6 shadow-sm border bg-white dark:bg-gray-800 dark:border-gray-700">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 dark:bg-purple-900">
                        <span className="text-2xl">📝</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 dark:text-gray-200">Sign & Verify</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base dark:text-gray-400">Cryptographically sign and verify messages</p>
                    <button className="text-green-600 font-medium flex items-center gap-1 text-sm sm:text-base dark:text-green-400">
                        Get Started <span>→</span>
                    </button>
                </div>
            </div>

            {/* Services Section */}
            <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full mb-4 dark:bg-green-900 dark:text-green-200">
                    Services
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 dark:text-gray-200">
                    Everything you need for DeFi success
                </h2>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-lg p-4 sm:p-6 text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-2xl">⚡</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Instant Transactions</h3>
                    <p className="text-white/90 mb-4 text-sm sm:text-base">
                        Experience lightning-fast transactions with Solana's high-performance blockchain technology.
                    </p>
                    <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span className="text-sm">Sub-second finality</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-lg p-4 sm:p-6 text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-2xl">🛡️</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure & Trustless</h3>
                    <p className="text-white/90 mb-4 text-sm sm:text-base">
                        Built on Solana's secure infrastructure with cryptographic verification for all transactions.
                    </p>
                    <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span className="text-sm">Military-grade encryption</span>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-4 sm:p-8 text-white text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Ready to get started?</h2>
                <p className="text-base sm:text-lg mb-6 text-white/90">
                    Join thousands of users already building on our platform
                </p>
                <button className="bg-white text-green-600 font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700">
                    Go to Dashboard →
                </button>
            </div>
        </div>
    )
}

// About Page Component
const AboutPage = () => {
    return (
        <div className="max-w-full sm:max-w-3xl mx-auto max-h-screen">
            <div className="rounded-lg p-4 sm:p-8 shadow-sm border bg-white dark:bg-gray-800 dark:border-gray-700">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 dark:text-gray-200">About Solana DApp Platform</h1>
                <div className="prose prose-sm sm:prose-lg">
                    <p className="text-gray-600 mb-4 dark:text-gray-400">
                        Welcome to the Solana DApp Platform - your gateway to decentralized finance on the Solana blockchain.
                        Our platform provides essential tools for managing your SOL tokens, from basic wallet operations to 
                        advanced cryptographic signing.
                    </p>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 dark:text-gray-200">Features</h2>
                    <ul className="list-disc pl-6 text-gray-600 mb-4 dark:text-gray-400">
                        <li>Secure wallet connection with multiple wallet providers</li>
                        <li>Request SOL airdrops for testing on devnet</li>
                        <li>Send SOL tokens to other wallets</li>
                        <li>Sign and verify messages cryptographically</li>
                        <li>Real-time balance checking</li>
                    </ul>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 dark:text-gray-200">Security</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Built on Solana's secure infrastructure, all transactions are verified cryptographically.
                        Your private keys never leave your wallet, ensuring maximum security.
                    </p>
                </div>
            </div>
        </div>
    )
}

function App() {
    const [activeTab, setActiveTab] = useState('home')
    
    // Configure wallet adapters
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new TorusWalletAdapter(),
        new LedgerWalletAdapter()
    ]

    return (
        <ConnectionProvider endpoint="https://api.devnet.solana.com">
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <ThemeProvider>
                        <div className="flex flex-col sm:flex-row min-h-screen w-full h-screen max-w-full max-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
                            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                            <MainContent activeTab={activeTab} />
                        </div>
                    </ThemeProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

export default App