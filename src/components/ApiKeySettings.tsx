"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Check, X, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const API_KEY_STORAGE_KEY = "groq_api_key";

// sessionStorageを使用（タブを閉じると消える、より安全）
const storage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  },
  set: (key: string): void => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  },
  remove: (): void => {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  }
};

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export function ApiKeySettings({ isOpen, onClose, onSave }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    // Load saved API key on mount
    const stored = storage.get();
    if (stored) {
      setSavedKey(stored);
      setApiKey(stored);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      storage.set(apiKey.trim());
      setSavedKey(apiKey.trim());
      onSave(apiKey.trim());
      onClose();
    }
  };

  const handleClear = () => {
    storage.remove();
    setApiKey("");
    setSavedKey(null);
    onSave("");
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Key className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">APIキー設定</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Groq APIキーを入力してください。
          </p>

          {/* Security notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">セキュリティについて</p>
              <ul className="mt-1 space-y-0.5 text-blue-600">
                <li>• キーはこのタブのみに保存されます</li>
                <li>• タブを閉じると自動的に削除されます</li>
                <li>• サーバーには保存されません</li>
              </ul>
            </div>
          </div>

          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-pink-500 hover:text-pink-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Groq ConsoleでAPIキーを取得
          </a>

          {/* Current status */}
          {savedKey && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">
                登録済み: {maskKey(savedKey)}
              </span>
            </div>
          )}

          {/* Input */}
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {savedKey && (
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                削除
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all",
                apiKey.trim()
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get stored API key
export function getStoredApiKey(): string | null {
  return storage.get();
}
