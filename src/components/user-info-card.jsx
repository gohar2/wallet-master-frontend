import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

export function UserInfoCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyAddress = async () => {
    if (!user?.walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Address copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-success to-primary rounded-full flex items-center justify-center">
            <User className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Wallet Connected</h3>
            <p className="text-sm text-gray-600">Your smart wallet is ready for gasless transactions</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Email:</span>
            <span className="text-sm text-gray-900 font-mono">{user?.email}</span>
          </div>
          
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Smart Wallet:</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900 font-mono">
                {user?.walletAddress ? truncateAddress(user.walletAddress) : "Not created"}
              </span>
              {user?.walletAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-primary"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}