'use client';

import React, { useState } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Customlogic from "../TokenSwap/page";
import NFTMarketplace from "../nft_logic/page";

export default function Main() {
  const wallet = useWallet();
  const [activeView, setActiveView] = useState<'dashboard' | 'swap' | 'nft'>('dashboard');

  // ── Token Swap View ────────────────────────────────────────
  if (activeView === 'swap') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-xl !px-5 !py-2.5 !font-medium transition" />
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10">
          <Customlogic />
        </div>
      </div>
    );
  }

  // ── NFT Marketplace View ───────────────────────────────────
  if (activeView === 'nft') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-xl !px-5 !py-2.5 !font-medium transition" />
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10">
          <NFTMarketplace />
        </div>
      </div>
    );
  }

  // ── Main Dashboard ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md">
              SD
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Solana DApp
            </h1>
          </div>

          <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-xl !px-5 !py-2.5 !font-medium transition" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 lg:py-16">
        {!wallet.publicKey ? (
          // Not connected ── Hero
          <div className="text-center py-20 lg:py-32">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight">
                Backing the Builders
              </h1>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                of the New Open Internet
              </h2>

              <p className="mt-8 text-xl text-gray-600 max-w-3xl mx-auto">
                Empowering decentralized trading with fast token swaps and a smooth NFT marketplace — built for creators and traders.
              </p>

              <div className="mt-12 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all">
                  <div className="text-6xl mb-4">🔄</div>
                  <h3 className="text-2xl font-bold text-gray-900">Token Swap</h3>
                  <p className="mt-3 text-gray-600">Secure, escrow-based peer-to-peer SPL token swaps</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-2xl font-bold text-gray-900">NFT Market</h3>
                  <p className="mt-3 text-gray-600">Mint, buy & trade digital collectibles instantly</p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><span className="text-indigo-500">⚡</span> Lightning Fast</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><span className="text-green-500">💸</span> Very Low Fees</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><span className="text-purple-500">🔒</span> Secure by Design</span>
              </div>
            </div>
          </div>
        ) : (
          // Connected ── Dashboard
          <>
            <div className="text-center mb-16">
              <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900">
                Welcome back! 👋
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Choose what you'd like to do today
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
              {/* Token Swap Card */}
              <div
                onClick={() => setActiveView('swap')}
                className="group bg-white rounded-3xl p-8 lg:p-10 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="text-8xl mb-6 transform group-hover:scale-110 transition-transform">🔄</div>

                <h3 className="text-4xl font-extrabold text-gray-900 mb-4">Token Swap</h3>
                <p className="text-lg text-gray-600 mb-8">
                  Swap any SPL tokens securely with escrow smart contracts — fast and trustless.
                </p>

                <div className="grid grid-cols-2 gap-5 mb-8">
                  <div className="bg-gray-50 rounded-2xl p-5 text-center">
                    <div className="text-xs text-gray-500 mb-1">Total Swaps</div>
                    <div className="text-2xl font-bold text-gray-800">1,234</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 text-center">
                    <div className="text-xs text-gray-500 mb-1">Volume</div>
                    <div className="text-2xl font-bold text-gray-800">2.5M SOL</div>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 group">
                  Launch Swap
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>

              {/* NFT Card */}
              <div
                onClick={() => setActiveView('nft')}
                className="group bg-white rounded-3xl p-8 lg:p-10 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="text-8xl mb-6 transform group-hover:scale-110 transition-transform">🎨</div>

                <h3 className="text-4xl font-extrabold text-gray-900 mb-4">NFT Marketplace</h3>
                <p className="text-lg text-gray-600 mb-8">
                  Discover, mint, buy & sell NFTs with instant finality — creator-first experience.
                </p>

                <div className="grid grid-cols-2 gap-5 mb-8">
                  <div className="bg-gray-50 rounded-2xl p-5 text-center">
                    <div className="text-xs text-gray-500 mb-1">Active Listings</div>
                    <div className="text-2xl font-bold text-gray-800">456</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 text-center">
                    <div className="text-xs text-gray-500 mb-1">Floor Price</div>
                    <div className="text-2xl font-bold text-gray-800">0.5 SOL</div>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 group">
                  Launch Marketplace
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="mt-16 bg-white rounded-2xl p-8 lg:p-10 shadow-md border border-gray-100 max-w-5xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span>📚</span> Quick Start Guide
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-gray-600">
                <div className="flex items-start gap-4">
                  <span className="text-2xl text-indigo-500">→</span>
                  <p>Click any card to open that feature</p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-2xl text-purple-500">→</span>
                  <p>Use the back button to return here anytime</p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-2xl text-pink-500">→</span>
                  <p>Your wallet is ready — start transacting</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}