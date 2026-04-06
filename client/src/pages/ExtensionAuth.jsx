import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthFetch } from '../auth/useAuthFetch';
import { API_BASE_URL } from '../config';
import { motion } from 'framer-motion';

const ExtensionAuth = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('initializing');
    const authFetch = useAuthFetch();

    useEffect(() => {
        const extensionId = searchParams.get('extensionId');
        if (!extensionId) {
            setStatus('error-no-id');
            return;
        }

        const connectToExtension = async () => {
            try {
                setStatus('generating-token');
                const res = await authFetch(`${API_BASE_URL}/api/auth/extension-token`);
                if (!res.ok) throw new Error('Failed to fetch extension token');
                
                const { token } = await res.json();
                
                setStatus('connecting');
                
                if (!window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
                    throw new Error('Chrome runtime not available');
                }

                window.chrome.runtime.sendMessage(extensionId, { action: 'SET_EXT_TOKEN', token }, (response) => {
                    if (window.chrome.runtime.lastError) {
                        console.error('[AUTH] ❌ Chrome error:', window.chrome.runtime.lastError);
                        setStatus('error-extension-not-found');
                    } else {
                        setStatus('success');
                        setTimeout(() => window.close(), 3000);
                    }
                });
            } catch (err) {
                console.error('[AUTH] ❌ Extension bridge failed:', err);
                setStatus('error-failed');
            }
        };

        connectToExtension();
    }, [searchParams, authFetch]);

    const getStatusContent = () => {
        switch (status) {
            case 'initializing':
            case 'generating-token':
                return {
                    icon: '🚀',
                    title: 'Authorizing Extension...',
                    desc: 'Grabbing a secure token for your CrackIt session.',
                    color: 'text-cyan-400'
                };
            case 'connecting':
                return {
                    icon: '🔗',
                    title: 'Linking Connection...',
                    desc: 'Sending token to the extension.',
                    color: 'text-amber-400'
                };
            case 'success':
                return {
                    icon: '✅',
                    title: 'Link Successful!',
                    desc: 'You can now close this tab. The extension is authenticated.',
                    color: 'text-emerald-400'
                };
            case 'error-no-id':
                return {
                    icon: '❌',
                    title: 'Missing extensionId',
                    desc: 'The extension did not provide its ID. Please try again from the extension popup.',
                    color: 'text-red-400'
                };
            case 'error-extension-not-found':
                return {
                    icon: '🕵️',
                    title: 'Extension Not Found',
                    desc: 'Could not communicate with the extension. Make sure it is installed and enabled.',
                    color: 'text-red-400'
                };
            default:
                return {
                    icon: '⚠️',
                    title: 'Connection Failed',
                    desc: 'Something went wrong while linking your account.',
                    color: 'text-red-400'
                };
        }
    };

    const content = getStatusContent();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#030303] relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none`} />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-[#0f111a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl z-10 text-center"
            >
                <div className="text-6xl mb-6">{content.icon}</div>
                <h1 className={`text-2xl font-bold mb-3 ${content.color}`}>{content.title}</h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">{content.desc}</p>
                
                {status === 'success' && (
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 3, ease: "linear" }}
                        className="h-1 bg-emerald-500 rounded-full origin-left mt-4"
                    />
                )}
                
                {(status.startsWith('error') || status === 'error-failed') && (
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all"
                    >
                        Try Again
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default ExtensionAuth;
