import { useState } from "react";
import { Button } from "./ui/button";
import darkLogo from "../../assets/ec37bb065d49c41d8d194954cdc4226b5e7e1837.png";
import { AuthModal } from "./auth-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../providers/auth-provider";

export function Header() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.slice(0, 2)?.toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/90 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={darkLogo} alt="Rankio" className="h-7 sm:h-8" />
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-7">
              <a href="#why-rankio-exists" className="text-sm text-muted-foreground hover:text-primary transition-colors">What Rankio Does</a>
              <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Industries
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                How it Works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="#sample-report" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sample Report
              </a>
              <a href="#why-rankio" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Why Rankio
              </a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                FAQs
              </a>
            </nav>

            {/* CTA / User Profile */}
            <div className="flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 h-auto"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-accent text-white text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-primary hidden sm:block">
                        {(user.user_metadata?.full_name as string) ?? user.email}
                      </span>
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">
                        {(user.user_metadata?.full_name as string) ?? "Account"}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                <Button
                  variant="outline"
                  className="hidden sm:flex"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => setAuthModalOpen(true)}
                >
                  Get Started
                </Button>
              </>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
