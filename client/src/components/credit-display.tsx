import { useState, useRef, useEffect } from "react";
import { Coins, Sparkles, LogIn, User, LogOut, ChevronDown, Star, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface CreditDisplayProps {
  credits: number;
  freeUsageRemaining: number;
  isAuthenticated: boolean;
  onBuyCredits: () => void;
  onSignIn?: () => void;
  hasPartnerAccount?: boolean;
}

export function CreditDisplay({
  credits,
  freeUsageRemaining,
  isAuthenticated,
  onBuyCredits,
  onSignIn,
  hasPartnerAccount = false,
}: CreditDisplayProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={credits <= 2 ? "default" : "outline"}
          onClick={onBuyCredits}
          className="shrink-0"
          data-testid="button-buy-credits"
        >
          <Coins className="w-4 h-4 mr-1" />
          {credits} credit{credits !== 1 ? "s" : ""}
        </Button>
        {user && (
          <div className="relative min-w-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer min-w-0"
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.firstName || "User"}
                  className="w-8 h-8 rounded-full shrink-0 max-w-none"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-sm hidden sm:inline max-w-[12ch] truncate">
                {user.firstName || user.email}
              </span>
              <ChevronDown className="w-3 h-3 hidden sm:inline opacity-60" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover text-popover-foreground shadow-lg z-50 py-1">
                {hasPartnerAccount && (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    onClick={() => {
                      setMenuOpen(false);
                      window.location.href = "/partner/dashboard";
                    }}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Partner Dashboard
                  </button>
                )}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = "/account";
                  }}
                >
                  <User className="w-4 h-4" />
                  My Account
                </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = "/account?tab=ambassador";
                }}
              >
                <Star className="w-4 h-4" />
                Ambassador
              </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = "/api/logout";
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="default"
        onClick={onBuyCredits}
        className="cursor-pointer"
        data-testid="button-buy-credits"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        {freeUsageRemaining > 0 ? (
          <>
            <span className="sm:hidden">{freeUsageRemaining} free</span>
            <span className="hidden sm:inline">
              {freeUsageRemaining} free {freeUsageRemaining === 1 ? "design" : "designs"} left
            </span>
          </>
        ) : (
          "Get Credits"
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => (onSignIn ? onSignIn() : (window.location.href = "/auth"))}
        data-testid="button-login-header"
      >
        <LogIn className="w-4 h-4 mr-1" />
        Sign In
      </Button>
    </div>
  );
}
