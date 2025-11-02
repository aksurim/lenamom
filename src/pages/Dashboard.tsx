import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api"; // Importando a instância da API
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Users, AlertTriangle, TrendingUp, Package, Archive, ArrowUp, ArrowDown } from 'lucide-react';

// Função auxiliar para formatar moeda
const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- Componente Auxiliar para Indicadores de Tendência ---
const TrendIndicator = ({ value }: { value: number | null | undefined }) => {
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return <p className="text-xs text-muted-foreground">vs. mês anterior</p>;
  }
  const isPositive = value > 0;
  return (
    <p className={`text-xs flex items-center ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
      <span>{value.toFixed(1)}% vs. mês anterior</span>
    </p>
  );
};

export default function Dashboard() {
  // --- Consultas de Dados (Queries) ---
  // CORREÇÃO: Usando 'api.get' que envia o token de autenticação
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => (await api.get("/dashboard/stats")).data
  });

  const { data: salesOverTime, isLoading: isLoadingSalesChart } = useQuery({
    queryKey: ['salesOverTime'],
    queryFn: async () => (await api.get("/dashboard/sales-over-time")).data
  });

  const { data: topProducts, isLoading: isLoadingTopProducts } = useQuery({
    queryKey: ['topProducts'],
    queryFn: async () => (await api.get("/dashboard/top-products")).data
  });

  const { data: lowStockAlerts, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: async () => (await api.get("/dashboard/low-stock-alerts")).data
  });

  const { data: stagnantStock, isLoading: isLoadingStagnantStock } = useQuery({
    queryKey: ['stagnantStock'],
    queryFn: async () => (await api.get("/dashboard/stagnant-stock")).data
  });

  const kpiCards = [
    {
      title: "Faturamento do Mês",
      value: formatCurrency(stats?.monthlyRevenue || 0),
      icon: <DollarSign className="h-6 w-6 text-green-500" />,
      bgColor: "bg-green-500/10",
      change: stats?.revenueChange,
    },
    {
      title: "Vendas no Mês",
      value: stats?.monthlySales || 0,
      icon: <ShoppingCart className="h-6 w-6 text-blue-500" />,
      bgColor: "bg-blue-500/10",
      change: stats?.salesChange,
    },
    {
      title: "Novos Clientes (Mês)",
      value: stats?.newCustomers || 0,
      icon: <Users className="h-6 w-6 text-teal-500" />,
      bgColor: "bg-teal-500/10",
    },
    {
      title: "Ticket Médio (Mês)",
      value: formatCurrency(stats?.averageTicket || 0),
      icon: <TrendingUp className="h-6 w-6 text-amber-500" />,
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cartões de Indicadores (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <Card key={index} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>{card.icon}</div>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-12 w-32 bg-muted rounded animate-pulse mt-1" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{card.value}</div>
                  <TrendIndicator value={card.change} />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Gráfico de Vendas */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Vendas nos Últimos 30 Dias</CardTitle></CardHeader>
          <CardContent className="pl-2">
            {isLoadingSalesChart ? (
              <div className="w-full h-[350px] bg-muted rounded animate-pulse flex items-center justify-center">Carregando gráfico...</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `R$${value}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Line type="monotone" dataKey="total" name="Faturamento" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 8, style: { stroke: '#10b981', strokeWidth: 2 } }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabelas Laterais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Produtos Mais Vendidos */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5"/> Top 5 Produtos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Total Vendido</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingTopProducts ? (
                    <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
                  ) : topProducts && topProducts.length > 0 ? (
                    topProducts.map((product: any, index: number) => (
                      <TableRow key={index}><TableCell className="py-2">{product.description}</TableCell><TableCell className="text-right py-2 font-medium text-green-400">{formatCurrency(parseFloat(product.total_sold))}</TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center">Nenhuma venda registrada este mês.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alertas de Estoque Baixo */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-destructive"><AlertTriangle className="h-5 w-5" /> Alerta de Estoque</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-center">Atual</TableHead><TableHead className="text-center">Mínimo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingLowStock ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
                  ) : lowStockAlerts && lowStockAlerts.length > 0 ? (
                    lowStockAlerts.map((product: any, index: number) => (
                      <TableRow key={index} className="text-destructive/90"><TableCell className="py-2">{product.description}</TableCell><TableCell className="text-center py-2 font-bold">{product.stock_quantity}</TableCell><TableCell className="text-center py-2">{product.min_quantity}</TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center">Nenhum produto com estoque baixo.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Estoque Parado */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-amber-600"><Archive className="h-5 w-5" /> Estoque Parado</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-center">Qtd.</TableHead><TableHead>Última Venda</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingStagnantStock ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
                  ) : stagnantStock && stagnantStock.length > 0 ? (
                    stagnantStock.map((product: any, index: number) => (
                      <TableRow key={index} className="text-muted-foreground">
                        <TableCell className="py-2">{product.description}</TableCell>
                        <TableCell className="text-center py-2 font-bold">{product.stock_quantity}</TableCell>
                        <TableCell className="py-2">{product.last_sale_date ? new Date(product.last_sale_date).toLocaleDateString('pt-BR') : 'Nunca vendido'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center">Nenhum produto com estoque parado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
