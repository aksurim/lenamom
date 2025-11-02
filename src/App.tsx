import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import PaymentMethods from "./pages/PaymentMethods";
import Settings from "./pages/Settings";
import StockEntry from "./pages/StockEntry";
import Sales from "./pages/Sales";
import SalesByProduct from "./pages/reports/SalesByProduct";
import SalesHistory from "./pages/reports/SalesHistory";
import StockBalance from "./pages/reports/StockBalance";
import ProfitabilityByProduct from "./pages/reports/ProfitabilityByProduct";
import CashMovements from "./pages/CashMovements"; // Importe a nova página
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stock-entry" element={<StockEntry />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/cash-movements" element={<CashMovements />} /> {/* Adicione a nova rota aqui */}
            <Route path="/reports/sales-by-product" element={<SalesByProduct />} />
            <Route path="/reports/sales-history" element={<SalesHistory />} />
            <Route path="/reports/stock-balance" element={<StockBalance />} />
            <Route path="/reports/profitability-by-product" element={<ProfitabilityByProduct />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      )}
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
