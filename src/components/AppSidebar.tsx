import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  FileText,
  PackagePlus,
  Settings,
  ChevronDown,
  Truck,
  DollarSign,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  url?: string;
  subItems?: { title: string; url: string }[];
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Fornecedores", url: "/suppliers", icon: Truck },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Formas de Pagamento", url: "/payment-methods", icon: CreditCard },
  { title: "Vendas", url: "/sales", icon: ShoppingCart },
  { title: "Movimento de Caixa", url: "/cash-movements", icon: DollarSign },
  {
    title: "Relatórios",
    icon: FileText,
    subItems: [
      { title: "Histórico de Vendas", url: "/reports/sales-history" },
      { title: "Vendas por Produto", url: "/reports/sales-by-product" },
      { title: "Balanço de Estoque", url: "/reports/stock-balance" },
      { title: "Relatório de Lucratividade", url: "/reports/profitability-by-product" },
    ]
  },
  { title: "Entrada de Estoque", url: "/stock-entry", icon: PackagePlus },
  { title: "Configurações", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { user } = useAuth();

  const menuItems = allMenuItems.filter(item => {
    if (!item.adminOnly) {
      return true;
    }
    return user?.perfil === 'admin';
  });

  return (
    <Sidebar collapsible="icon">
      {/* CORREÇÃO: Divisão do cabeçalho do logo e do conteúdo do menu */}
      <div className="bg-white p-4 flex items-center justify-center">
        <NavLink to="/">
          <img src="/logo.png" alt="LENAMOM Logo" className="h-16 w-auto" />
        </NavLink>
      </div>

      <SidebarContent className="flex-grow">
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                item.subItems ? (
                  <Collapsible key={item.title} asChild defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
