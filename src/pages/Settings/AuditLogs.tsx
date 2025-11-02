import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuditLog {
  id: number;
  usuario_id: number | null;
  usuario_nome: string;
  acao: string;
  detalhes: string;
  data_hora: string;
}

export default function AuditLogsSettings() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get("/audit-logs")).data,
  });

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-foreground">Logs de Auditoria do Sistema</h3>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Carregando logs...</TableCell></TableRow>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.data_hora), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell>{log.usuario_nome}</TableCell>
                  <TableCell><span className="font-mono text-xs bg-muted p-1 rounded">{log.acao}</span></TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-xs cursor-help">{log.detalhes}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          {(() => {
                            try {
                              const parsedDetails = JSON.parse(log.detalhes);
                              return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(parsedDetails, null, 2)}</pre>;
                            } catch (e) {
                              return <pre className="text-xs whitespace-pre-wrap">{log.detalhes}</pre>;
                            }
                          })()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="text-center">Nenhum log de auditoria encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
