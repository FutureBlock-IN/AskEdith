import { useState } from "react";
import { Link } from "wouter";
import { Menu, X, User, LogOut, Settings, UserCheck, Shield, Brain, LayoutDashboard } from "lucide-react";
import lightbulbLogo from "@assets/image_1749008518066.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useClerk, SignInButton, SignUpButton } from "@clerk/clerk-react";

interface HeaderProps {
  onSignupClick?: () => void;
}

export default function Header({ onSignupClick }: HeaderProps) {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Note: We'll need to sync user role from our database
  const isAdmin = user?.publicMetadata?.role === 'admin';

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full">
        <div className="flex items-center h-16">
          {/* Logo and Tagline - Left Justified with 40px padding */}
          <div className="flex items-center space-x-4 flex-shrink-0" style={{ paddingLeft: '40px' }}>
            <Link href="/landing" className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={lightbulbLogo}
                  alt="AskEdith Community"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-700">AskEdith</h1>
              </div>
            </Link>
            <div className="hidden lg:block text-gray-600 xl:text-sm lg:text-xs md:text-[10px] ml-4 leading-tight">
              <div>All Things Retirement.</div>
              <div>All Things Care.</div>
            </div>
          </div>

          {/* Mobile Navigation - Extra small fonts, no bold */}
          <nav className="flex sm:hidden items-center justify-center space-x-1 flex-1 px-1">
            <Link href="/community" className="text-gray-700 hover:text-askEdithTeal transition-colors text-[10px]">
              Forums
            </Link>
            <Link href="/this-week-by" className="text-gray-700 hover:text-askEdithTeal transition-colors text-[10px]">
              News
            </Link>
            <Link href="/experts" className="text-gray-700 hover:text-askEdithTeal transition-colors flex items-center gap-0.5 text-[10px]">
              <UserCheck className="w-2.5 h-2.5" />
              Experts
            </Link>
          </nav>

          {/* Small Mobile/Tablet Navigation - Very small, no bold */}
          <nav className="hidden sm:flex md:hidden items-center justify-center space-x-2 flex-1 px-2">
            <Link href="/community" className="text-gray-700 hover:text-askEdithTeal transition-colors text-[11px]">
              Forums
            </Link>
            <Link href="/this-week-by" className="text-gray-700 hover:text-askEdithTeal transition-colors text-[11px]">
              News
            </Link>
            <Link href="/experts" className="text-gray-700 hover:text-askEdithTeal transition-colors flex items-center gap-1 text-[11px]">
              <UserCheck className="w-3 h-3" />
              Experts
            </Link>
          </nav>

          {/* Tablet Navigation - Small fonts, no bold */}
          <nav className="hidden md:flex lg:hidden items-center justify-center space-x-2 flex-1">
            <Link href="/community" className="text-gray-700 hover:text-askEdithTeal transition-colors text-xs">
              Forums
            </Link>
            <Link href="/this-week-by" className="text-gray-700 hover:text-askEdithTeal transition-colors text-xs">
              News
            </Link>
            <Link href="/experts" className="text-gray-700 hover:text-askEdithTeal transition-colors flex items-center gap-1 text-xs">
              <UserCheck className="w-3 h-3" />
              Experts
            </Link>
          </nav>

          {/* Large Tablet Navigation - Small size, no bold */}
          <nav className="hidden lg:flex xl:hidden items-center justify-center space-x-3 flex-1">
            <Link href="/community" className="text-gray-700 hover:text-askEdithTeal transition-colors text-sm">
              Forums
            </Link>
            <Link href="/this-week-by" className="text-gray-700 hover:text-askEdithTeal transition-colors text-sm">
              News
            </Link>
            <Link href="/experts" className="text-gray-700 hover:text-askEdithTeal transition-colors flex items-center gap-1 text-sm">
              <UserCheck className="w-4 h-4" />
              Experts
            </Link>
          </nav>

          {/* Desktop Navigation - Full size, no bold */}
          <nav className="hidden xl:flex items-center justify-center space-x-8 flex-1">
            <Link href="/community" className="text-gray-700 hover:text-askEdithTeal transition-colors text-lg">
              Forums
            </Link>
            <Link href="/this-week-by" className="text-gray-700 hover:text-askEdithTeal transition-colors text-lg">
              News
            </Link>
            <Link href="/experts" className="text-gray-700 hover:text-askEdithTeal transition-colors flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5" />
              Experts
            </Link>
          </nav>



          {/* Founder's Letter Link - Much smaller on tablets */}
          <div className="hidden lg:block mr-3 lg:mr-5">
            <Link href="/founders-letter" className="text-gray-800 hover:text-askEdithTeal transition-colors xl:text-4xl lg:text-lg" style={{ fontFamily: 'Tangerine, cursive', fontWeight: '700' }}>
              Founder's Letter
            </Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3" style={{ paddingRight: '40px' }}>
            {isSignedIn && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user.imageUrl || undefined} />
                      <AvatarFallback>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.emailAddresses[0]?.emailAddress}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {/* <DropdownMenuItem asChild>
                    <Link href="/subscribe">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <SignInButton mode="modal">
                  <Button variant="ghost">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    Join Our Community
                  </Button>
                </SignUpButton>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-semibold">Menu</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>



                {/* Mobile Navigation */}
                <div className="space-y-4">
                  <Link
                    href="/"
                    className="block text-gray-600 hover:text-purple-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>

                  <Link
                    href="/categories"
                    className="block text-gray-600 hover:text-purple-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Categories
                  </Link>
                  <a
                    href="#local-resources"
                    className="block text-gray-600 hover:text-purple-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Local Resources
                  </a>
                  <a
                    href="#safety"
                    className="block text-gray-600 hover:text-purple-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Safety
                  </a>
                </div>

                {!isSignedIn && (
                  <div className="mt-6 pt-6 border-t space-y-3">
                    <SignInButton mode="modal">
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        Join Our Community
                      </Button>
                    </SignUpButton>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

    </header>
  );
}
