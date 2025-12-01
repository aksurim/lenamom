import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Store, Archive, Building } from "lucide-react"; // Removido Printer
import UsersSettings from "./Settings/Users";
import AuditLogsSettings from "./Settings/AuditLogs";

// Removido default_printer_type
interface SettingsData {
  store_name?: string;
  stagnant_stock_days?: string;
  company_name?: string;
  cnpj?: string;
  instagram?: string;
  contact?: string;
  logo_url?: string;
}

function GeneralSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SettingsData>({});

  const { data: currentSettings, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: SettingsData) => api.put("/settings", newSettings).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["stagnantStock"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message;
        toast.error(`Erro ao salvar: ${errorMessage}`);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settings);
  };

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Configurações da Loja</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="store_name">Nome da Loja</Label>
            <Input id="store_name" value={settings.store_name || ""} onChange={handleInputChange} placeholder="LENAMOM" />
            <p className="text-sm text-muted-foreground mt-2">Este nome aparecerá no título da aba do navegador e em locais internos do sistema.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Dados da Empresa para Documentos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Nome da Empresa</Label>
            <Input id="company_name" value={settings.company_name || ""} onChange={handleInputChange} placeholder="LENAMOM JÓIAS E PERFUMARIA" />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" value={settings.instagram || ""} onChange={handleInputChange} placeholder="@lenamom.joias" />
          </div>
          <div>
            <Label htmlFor="contact">Contato (Telefone/WhatsApp)</Label>
            <Input id="contact" value={settings.contact || ""} onChange={handleInputChange} placeholder="(83) 98877-6655" />
          </div>
          <div>
            <Label htmlFor="logo_url">URL do Logo (P&B)</Label>
            <Input id="logo_url" value={settings.logo_url || ""} onChange={handleInputChange} placeholder="/logo_pb.png" />
            <p className="text-sm text-muted-foreground mt-2">Caminho para a imagem do logo na pasta `public`. Ex: /meu-logo.png</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" />Configurações de Estoque</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="stagnant_stock_days">Dias para Alerta de Estoque Parado</Label>
            <Input id="stagnant_stock_days" type="number" value={settings.stagnant_stock_days || ""} onChange={handleInputChange} placeholder="90" />
            <p className="text-sm text-muted-foreground mt-2">Produtos sem venda por este período aparecerão no alerta do dashboard.</p>
          </div>
        </CardContent>
      </Card>

      {/* Card de Impressão Removido */}

      <Button type="submit" disabled={updateSettingsMutation.isPending}>
        {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações Gerais'}
      </Button>
    </form>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Configurações</h2>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="audit-logs">Logs de Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="users">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="audit-logs">
          <AuditLogsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
