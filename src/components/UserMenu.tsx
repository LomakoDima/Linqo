import { Link } from "@tanstack/react-router";
import { Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth-client";

// The account affordance shared by the builder header and the landing
// header once signed in — one avatar trigger instead of a loose name +
// bare icon button pair, so "who am I" and "what can I do about it" live
// in the same place.
export function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-primary/20">
        <Avatar className="h-8 w-8 cursor-pointer border border-border">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
