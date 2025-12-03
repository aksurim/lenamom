import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Store, Archive, Building } from "lucide-react";
import UsersSettings from "./Settings/Users";
import AuditLogsSettings from "./Settings/AuditLogs";

// Interfaces separadas para clareza
interface GeneralSettingsData {
  store_name?: string;
  stagnant_stock_days?: string;
}

interface CompanySettingsData {
  company_name?: string;
  instagram?: string;
  contact?: string;
  logo_url?: string;
  cnpj?: string; // Adicionado para consistência com o backend
}

function GeneralSettings() {
  const queryClient = useQueryClient();
  
  // Estados separados para cada tipo de configuração
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsData>({});
  const [companySettings, setCompanySettings] = useState<CompanySettingsData>({});

  // Query para configurações gerais (do banco de dados)
  const { data: currentGeneralSettings, isLoading: isLoadingGeneral } = useQuery<GeneralSettingsData>({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });

  // Query para configurações da empresa (do arquivo JSON)
  const { data: currentCompanySettings, isLoading: isLoadingCompany } = useQuery<CompanySettingsData>({
    queryKey: ["companySettings"],
    queryFn: async () => (await api.get("/company-settings")).data,
  });

  useEffect(() => {
    if (currentGeneralSettings) {
      setGeneralSettings(currentGeneralSettings);
    }
  }, [currentGeneralSettings]);

  useEffect(() => {
    if (currentCompanySettings) {
      setCompanySettings(currentCompanySettings);
    }
  }, [currentCompanySettings]);

  // Mutação para salvar configurações GERAIS (no banco de dados)
  const updateGeneralSettingsMutation = useMutation({
    mutationFn: (newSettings: GeneralSettingsData) => api.put("/settings", newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações da loja e estoque salvas com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao salvar: ${error.response?.data?.message || error.message}`),
  });

  // CORREÇÃO: Mutação dedicada para salvar configurações da EMPRESA (no arquivo JSON)
  const updateCompanySettingsMutation = useMutation({
    mutationFn: (newSettings: CompanySettingsData) => api.post("/company-settings", newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success("Dados da empresa para documentos salvos com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao salvar: ${error.response?.data?.message || error.message}`),
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setGeneralSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [id]: value }));
  };

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGeneralSettingsMutation.mutate(generalSettings);
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettingsMutation.mutate(companySettings);
  };

  if (isLoadingGeneral || isLoadingCompany) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleGeneralSubmit} className="space-y-8">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Configurações da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="store_name">Nome da Loja</Label>
              <Input id="store_name" value={generalSettings.store_name || ""} onChange={handleGeneralChange} placeholder="LENAMOM" />
              <p className="text-sm text-muted-foreground mt-2">Este nome aparecerá no título da aba do navegador e em locais internos do sistema.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" />Configurações de Estoque</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stagnant_stock_days">Dias para Alerta de Estoque Parado</Label>
              <Input id="stagnant_stock_days" type="number" value={generalSettings.stagnant_stock_days || ""} onChange={handleGeneralChange} placeholder="90" />
              <p className="text-sm text-muted-foreground mt-2">Produtos sem venda por este período aparecerão no alerta do dashboard.</p>
            </div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={updateGeneralSettingsMutation.isPending}>
          {updateGeneralSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações Gerais'}
        </Button>
      </form>

      <form onSubmit={handleCompanySubmit} className="space-y-8">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Dados da Empresa para Documentos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company_name">Nome da Empresa</Label>
              <Input id="company_name" value={companySettings.company_name || ""} onChange={handleCompanyChange} placeholder="LENAMOM JÓIAS E PERFUMARIA" />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={companySettings.instagram || ""} onChange={handleCompanyChange} placeholder="@lenamom.joias" />
            </div>
            <div>
              <Label htmlFor="contact">Contato (Telefone/WhatsApp)</Label>
              <Input id="contact" value={companySettings.contact || ""} onChange={handleCompanyChange} placeholder="(83) 98877-6655" />
            </div>
            <div>
              <Label htmlFor="logo_url">URL do Logo (P&B)</Label>
              <Input id="logo_url" value={companySettings.logo_url || ""} onChange={handleCompanyChange} placeholder="/logo_pb.png" />
              <p className="text-sm text-muted-foreground mt-2">Caminho para a imagem do logo na pasta `public`. Ex: /meu-logo.png</p>
            </div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={updateCompanySettingsMutation.isPending}>
          {updateCompanySettingsMutation.isPending ? 'Salvando...' : 'Salvar Dados da Empresa'}
        </Button>
      </form>
    </div>
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
