import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';

interface User {
  id: number;
  nome: string;
  username: string;
  perfil: 'admin' | 'usuario';
  criado_em: string;
}

type UserFormData = Omit<User, 'id' | 'criado_em'> & { senha?: string };

const initialFormData: UserFormData = {
  nome: "",
  username: "",
  senha: "",
  perfil: "usuario",
};

export default function UsersSettings() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data,
  });

  const mutationOptions = {
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(data.message || "Operação realizada com sucesso!");
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro: ${errorMessage}`);
    },
  };

  const createMutation = useMutation({ mutationFn: (newUser: UserFormData) => api.post("/users", newUser).then(res => res.data), ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> }) => api.put(`/users/${id}`, data).then(res => res.data), ...mutationOptions });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/users/${id}`).then(res => res.data), ...mutationOptions });

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
    setFormData(initialFormData);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user, senha: '' }); // Limpa o campo senha ao editar
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (editingUser) {
      if (!dataToSend.senha) { // Não envia o campo senha se estiver vazio na edição
        delete dataToSend.senha;
      }
      updateMutation.mutate({ id: editingUser.id, data: dataToSend });
    } else {
      if (!dataToSend.senha) {
        toast.error("A senha é obrigatória para criar um novo usuário.");
        return;
      }
      createMutation.mutate(dataToSend);
    }
  };

  const handleDelete = (userId: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h3>
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else setOpen(true); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div><Label htmlFor="nome">Nome Completo</Label><Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required /></div>
              <div><Label htmlFor="username">Nome de Usuário</Label><Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required /></div>
              <div><Label htmlFor="senha">Senha</Label><Input id="senha" type="password" placeholder={editingUser ? "Deixe em branco para não alterar" : ""} value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} required={!editingUser} /></div>
              <div><Label htmlFor="perfil">Perfil</Label><Select value={formData.perfil} onValueChange={(v: any) => setFormData({ ...formData, perfil: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="usuario">Usuário</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingUser ? "Atualizar" : "Criar")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Usuário</TableHead><TableHead>Perfil</TableHead><TableHead>Criado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.nome}</TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.perfil}</TableCell>
                  <TableCell>{format(new Date(user.criado_em), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(user)}><Pencil className="h-4 w-4" /></Button>
                      {currentUser?.id !== user.id && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(user.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center">Nenhum usuário encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
