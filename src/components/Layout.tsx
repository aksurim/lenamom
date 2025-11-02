import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api"; // Importando a instância da API
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { User, LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  const { data: settings, isLoading } = useQuery<{ store_name?: string }>({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        // CORREÇÃO: Usando a instância 'api' do axios que envia o token
        const response = await api.get("/settings");
        return response.data;
      } catch (error) {
        console.error("Falha ao buscar o nome da loja, usando fallback.", error);
        return { store_name: "Art Licor" }; // Fallback em caso de erro
      }
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
    refetchOnWindowFocus: false,
    retry: 2, // Tenta novamente em caso de falha inicial (útil durante o login)
  });

  const storeName = settings?.store_name || "Art Licor";
  const currentYear = new Date().getFullYear();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-background">
          <header className="h-14 border-b bg-card flex items-center px-4 sticky top-0 z-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <SidebarTrigger />
                <h1 className="ml-4 text-lg font-semibold text-foreground">
                  Sistema de Gestão - {isLoading ? "..." : storeName}
                </h1>
              </div>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-auto justify-start gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.nome}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.nome}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.perfil.charAt(0).toUpperCase() + user.perfil.slice(1)}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          <div className="flex-1 p-6">
            {children}
          </div>

          <footer className="py-4 border-t">
            <p className="text-center text-sm text-muted-foreground">
              © {currentYear} Aksurim Software. Todos os direitos reservados.
            </p>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
