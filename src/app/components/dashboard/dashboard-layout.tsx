import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, FileText, CreditCard, Settings, LogOut, Menu, X, Home, Link as LinkIcon } from "lucide-react";
import darkLogo from "../../../assets/ec37bb065d49c41d8d194954cdc4226b5e7e1837.png";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth } from "../../providers/auth-provider";
import { Footer } from "../footer";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Reports", path: "/dashboard/reports" },
  { icon: CreditCard, label: "Subscription", path: "/dashboard/subscription" },
  { icon: LinkIcon, label: "Integrations", path: "/dashboard/integrations" },
  { icon: Settings, label: "Profile Settings", path: "/dashboard/settings" },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-3 sm:h-20 sm:gap-4">
          {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={darkLogo} alt="Rankio" className="h-10 w-auto sm:h-12" />
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-gray-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* User Profile Dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg border-0 px-3 py-2 shadow-none transition-colors hover:bg-gray-50">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-accent text-sm text-white">
                        {(user?.user_metadata?.full_name as string)?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    <span className="text-sm font-medium text-primary">
                      {(user?.user_metadata?.full_name as string) ?? user?.email ?? "User"}
                    </span>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mt-2 w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
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
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex w-full max-w-7xl flex-1 px-4 md:px-6">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-4rem)] border-r border-border/40 bg-white sticky top-16">
          <nav className="p-4 space-y-1">
            {/* Back to Website Button */}
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-gray-50 hover:text-primary mb-4 border border-border/40"
            >
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">Home</span>
            </Link>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/20 shadow-sm shadow-accent/10"
                      : "text-muted-foreground hover:bg-gray-50 hover:text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 bg-white md:hidden">
            <nav className="p-4 space-y-1">
              {/* Back to Website Button */}
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-gray-50 hover:text-primary mb-4 border border-border/40"
              >
                <Home className="h-5 w-5" />
                <span className="text-sm font-medium">Home</span>
              </Link>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-accent/10 text-accent border border-accent/20 shadow-sm shadow-accent/10"
                        : "text-muted-foreground hover:bg-gray-50 hover:text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-border/40">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 py-5 md:py-8 md:pl-8">
          <Outlet />
        </main>
      </div>

      <Footer variant="app" />
    </div>
  );
}
