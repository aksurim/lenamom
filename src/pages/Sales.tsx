import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, XCircle, ChevronsUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils";
import { sendTsplOverUsb } from "@/lib/usbPrinter";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface Product { id: number; code: string; barcode?: string; description: string; sale_price: number | string; stock_quantity: number; }
interface Customer { id: number; name: string; document?: string; phone?: string; }
interface PaymentMethod { id: number; description: string; }
interface SaleItem extends Product { quantity: number; unit_price: number; subtotal: number; }
type SaleDataForPrint = { 
    saleId: number; 
    saleCode: string; 
    customer: Customer; 
    paymentMethod: PaymentMethod; 
    items: SaleItem[];
    total_amount: number;
    paid_amount: number;
    shipping_cost: number;
};

// --- Componentes Auxiliares ---
function PriceInput({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
    const [displayValue, setDisplayValue] = useState(value.toFixed(2).replace('.', ','));
    useEffect(() => { setDisplayValue(value.toFixed(2).replace('.', ',')); }, [value]);
    const handleBlur = () => {
      const numericValue = parseFloat(displayValue.replace(',', '.'));
      if (!isNaN(numericValue)) onChange(numericValue);
      else setDisplayValue(value.toFixed(2).replace('.', ','));
    };
    return <Input type="text" value={displayValue} onChange={(e) => setDisplayValue(e.target.value)} onBlur={handleBlur} className="w-24 text-right" />;
}
  
function ProductSearch({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { data: products, isLoading } = useQuery<Product[]>({
      queryKey: ["products_search", searchQuery],
      queryFn: async () => {
        if (searchQuery.length < 2) return [];
        const response = await api.get("/products/search", { params: { q: searchQuery } });
        return response.data;
      },
      enabled: searchQuery.length > 1,
    });
  
    useEffect(() => {
      if (!isLoading && products && products.length === 1 && products[0].barcode === searchQuery) {
        handleSelect(products[0]);
      }
    }, [products, isLoading, searchQuery]);
  
    const handleSelect = (product: Product) => { onProductSelect(product); setSearchQuery(""); setOpen(false); };
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">Buscar por código, descrição ou cód. de barras...<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
          <CommandInput placeholder="Buscar produto..." onValueChange={setSearchQuery} />
          <CommandList>
            {isLoading && <CommandItem disabled>Buscando...</CommandItem>}
            {!isLoading && !products?.length && searchQuery.length > 1 && <CommandItem disabled>Nenhum produto encontrado.</CommandItem>}
            <CommandGroup>{products?.map((product) => (<CommandItem key={product.id} onSelect={() => handleSelect(product)} value={`${product.code} - ${product.description}`}>{product.code} - {product.description}</CommandItem>))}</CommandGroup>
          </CommandList>
        </Command></PopoverContent>
      </Popover>
    );
}
  
function CheckoutModal({ isOpen, onClose, totalAmount, onConfirm, isPending }: { isOpen: boolean; onClose: () => void; totalAmount: number; onConfirm: (details: any) => void; isPending: boolean; }) {
    const [customerId, setCustomerId] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [paidAmount, setPaidAmount] = useState("");
  
    const { data: customers } = useQuery<Customer[]>({ queryKey: ["customers"], queryFn: async () => (await api.get("/customers")).data });
    const { data: paymentMethods } = useQuery<PaymentMethod[]>({ queryKey: ["payment-methods"], queryFn: async () => (await api.get("/payment-methods")).data });
  
    const changeAmount = useMemo(() => (parseFloat(paidAmount.replace(',', '.')) || 0) - totalAmount, [paidAmount, totalAmount]);
  
    useEffect(() => { if(isOpen) setPaidAmount(totalAmount.toFixed(2).replace('.', ',')); }, [isOpen, totalAmount]);
  
    const handleConfirm = () => {
      if (!paymentMethodId) { toast.error("Selecione uma forma de pagamento."); return; }
      const finalPaidAmount = parseFloat(paidAmount.replace(',', '.')) || 0;
      if (finalPaidAmount < totalAmount) { toast.error("O valor pago não pode ser menor que o total do pedido."); return; }
  
      const customer = customers?.find(c => c.id.toString() === customerId);
      const paymentMethod = paymentMethods?.find(p => p.id.toString() === paymentMethodId);
  
      onConfirm({
        customer_id: customerId ? parseInt(customerId) : null,
        payment_method_id: parseInt(paymentMethodId),
        paid_amount: finalPaidAmount,
        change_amount: changeAmount,
        customer: customer,
        paymentMethod: paymentMethod,
      });
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>Preencha os detalhes de pagamento para concluir a venda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center mb-4"><p className="text-lg text-muted-foreground">Total do Pedido</p><p className="text-5xl font-bold">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            <div><Label>Cliente (Opcional)</Label><Select onValueChange={setCustomerId} value={customerId}><SelectTrigger><SelectValue placeholder="Venda sem cliente" /></SelectTrigger><SelectContent>{customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Forma de Pagamento</Label><Select onValueChange={setPaymentMethodId} value={paymentMethodId} required><SelectTrigger><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.description}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Valor Pago</Label><Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="text-xl h-12 text-right" /></div>
            <div className="flex justify-between items-center bg-muted p-4 rounded-md"><span className="text-lg font-medium">Troco</span><span className={`text-2xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>{changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" size="lg" onClick={handleConfirm} disabled={isPending}>{isPending ? 'Processando...' : 'Confirmar Pedido'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

function PostSaleModal({ saleData, onClose }: { saleData: SaleDataForPrint | null; onClose: () => void; }) {
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrintReceipt = async () => {
        if (!saleData) return;
        setIsPrinting(true);

        const printPromise = async () => {
            const response = await api.post('/sales/generate-receipt-command', { saleId: saleData.saleId });
            const { tsplCommand } = response.data;
            if (!tsplCommand) {
                throw new Error("Comando TSPL não recebido do servidor.");
            }
            await sendTsplOverUsb(tsplCommand);
        };

        toast.promise(printPromise(), {
            loading: 'Gerando cupom... Por favor, selecione a impressora na janela do navegador.',
            success: 'Cupom enviado para a impressora!',
            error: (err: any) => `Falha na impressão: ${err.message || 'Nenhum dispositivo selecionado ou erro de comunicação.'}`,
            finally: () => setIsPrinting(false),
        });
    };

    const handlePrintPdf = async () => {
        if (!saleData) return;
        try {
            await generateStandardPdf({
                fileName: `Pedido-${saleData.saleCode}`,
                title: `Pedido de Venda #${saleData.saleCode}`,
                drawContent: (doc: jsPDF, startY: number) => {
                    const formatCurrency = (val: number | string) => 
                        Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    const tableHead = [['Produto', 'Qtd', 'Vl. Unit', 'Total']];
                    const tableBody = saleData.items.map((item) => [
                        item.description || 'Produto sem descrição',
                        item.quantity.toString(),
                        formatCurrency(item.unit_price || 0),
                        formatCurrency(item.subtotal || 0),
                    ]);

                    autoTable(doc, {
                        startY: startY + 5,
                        head: tableHead,
                        body: tableBody,
                        theme: 'striped',
                        headStyles: { fillColor: [66, 66, 66] },
                        styles: { fontSize: 10 },
                        columnStyles: {
                            0: { cellWidth: 'auto' },
                            1: { halign: 'center' },
                            2: { halign: 'right' },
                            3: { halign: 'right' }
                        },
                        margin: { left: 14, right: 14 }
                    });

                    // @ts-ignore
                    const finalY = doc.lastAutoTable.finalY + 10;
                    const pageWidth = doc.internal.pageSize.width;
                    const marginR = 14;

                    doc.setFontSize(10);
                    
                    const printRight = (text: string, y: number, isBold: boolean = false) => {
                        doc.setFont("helvetica", isBold ? "bold" : "normal");
                        doc.text(text, pageWidth - marginR, y, { align: 'right' });
                    };

                    let currentY = finalY;
                    const lineHeight = 6;

                    const subtotal = saleData.items.reduce((acc, i) => acc + Number(i.subtotal || 0), 0);
                    
                    printRight(`Subtotal: ${formatCurrency(subtotal)}`, currentY);
                    currentY += lineHeight;

                    if (Number(saleData.shipping_cost) > 0) {
                         printRight(`Frete: ${formatCurrency(saleData.shipping_cost)}`, currentY);
                         currentY += lineHeight;
                    }

                    doc.setFontSize(12);
                    printRight(`TOTAL: ${formatCurrency(saleData.total_amount)}`, currentY + 2, true);
                    currentY += lineHeight + 5;

                    doc.setFontSize(10);
                    printRight(`Forma de Pagamento: ${saleData.paymentMethod.description}`, currentY);
                    currentY += lineHeight;
                    printRight(`Valor Pago: ${formatCurrency(saleData.paid_amount)}`, currentY);
                }
            });
        } catch (error) {
            console.error("Erro ao gerar recibo PDF:", error);
            toast.error("Falha ao gerar recibo PDF.");
        }
    };

    return (
        <Dialog open={!!saleData} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Venda Finalizada com Sucesso!</DialogTitle>
                    <DialogDescription>O que você gostaria de fazer a seguir?</DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button onClick={handlePrintPdf} disabled={isPrinting}>Gerar PDF A4</Button>
                    <Button onClick={handlePrintReceipt} disabled={isPrinting}>{isPrinting ? "Imprimindo..." : "Imprimir Cupom (USB)"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Componente Principal da Página de Vendas ---
export default function Sales() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [displayShippingCost, setDisplayShippingCost] = useState("0,00");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [postSaleData, setPostSaleData] = useState<SaleDataForPrint | null>(null);
  const queryClient = useQueryClient();

  const subtotal = useMemo(() => saleItems.reduce((sum, i) => sum + i.subtotal, 0), [saleItems]);
  const totalAmount = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

  useEffect(() => { setDisplayShippingCost(shippingCost.toFixed(2).replace('.', ',')); }, [shippingCost]);

  const handleShippingCostBlur = () => {
    const numericValue = parseFloat(displayShippingCost.replace(',', '.'));
    if (!isNaN(numericValue)) setShippingCost(numericValue);
    else setDisplayShippingCost(shippingCost.toFixed(2).replace('.', ','));
  };

  const saleMutation = useMutation({
    mutationFn: async (params: any) => {
      const { customer, paymentMethod, ...saleData } = params;
      const payload = {
        ...saleData,
        items: saleItems.map(item => ({ product_id: item.id, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal })),
        shipping_cost: shippingCost,
        total_amount: totalAmount,
      };
      const response = await api.post("/sales", payload);
      const result = response.data;
      
      // Monta o objeto para o PostSaleModal
      const dataForModal: SaleDataForPrint = {
        saleId: result.saleId,
        saleCode: result.saleCode,
        customer: customer,
        paymentMethod: paymentMethod,
        items: [...saleItems],
        total_amount: totalAmount,
        paid_amount: saleData.paid_amount,
        shipping_cost: shippingCost,
      };
      return dataForModal;
    },
    onSuccess: (data) => {
      toast.success(`Pedido ${data.saleCode} realizado com sucesso!`);
      setPostSaleData(data);
      setIsCheckoutOpen(false);
      setSaleItems([]);
      setShippingCost(0);
      queryClient.invalidateQueries({ queryKey: ['products_search'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao realizar pedido: ${errorMessage}`);
    }
  });

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) { toast.error("Produto sem estoque!"); return; }
    const salePrice = Number(product.sale_price);
    if (isNaN(salePrice)) { toast.error("Preço de venda inválido."); return; }
    setSaleItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) { toast.warning("Quantidade máxima em estoque atingida."); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, { ...product, quantity: 1, unit_price: salePrice, subtotal: salePrice }];
    });
  };

  const handleUpdateItem = (id: number, field: 'quantity' | 'unit_price', value: number) => {
    setSaleItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQuantity = field === 'quantity' ? value : i.quantity;
        if (newQuantity > i.stock_quantity) {
          toast.warning(`Estoque máximo: ${i.stock_quantity}.`);
          return { ...i, quantity: i.stock_quantity, subtotal: i.stock_quantity * i.unit_price };
        }
        const newUnitPrice = field === 'unit_price' ? value : i.unit_price;
        return { ...i, [field]: value, subtotal: newQuantity * newUnitPrice };
      }
      return i;
    }));
  };

  const handleRemoveItem = (id: number) => setSaleItems(prev => prev.filter(i => i.id !== id));
  const handleCancelSale = () => { if (saleItems.length > 0 && confirm("Deseja realmente cancelar o pedido?")) { setSaleItems([]); setShippingCost(0); } };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <ProductSearch onProductSelect={handleAddProduct} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-24">Qtd.</TableHead>
                    <TableHead className="w-32">Preço Unit.</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhum item no pedido.</TableCell></TableRow>
                  ) : (
                    saleItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          <Input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-20 text-center" min="1" max={item.stock_quantity} />
                        </TableCell>
                        <TableCell>
                          <PriceInput value={item.unit_price} onChange={newValue => handleUpdateItem(item.id, 'unit_price', newValue)} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between items-center">
                <Label htmlFor="shipping-cost" className="text-muted-foreground">Frete</Label>
                <Input id="shipping-cost" value={displayShippingCost} onChange={e => setDisplayShippingCost(e.target.value)} onBlur={handleShippingCostBlur} className="w-24 text-right" />
              </div>
              <div className="flex justify-between items-center text-xl font-bold"><span >Total</span><span>{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button size="lg" className="w-full" onClick={() => setIsCheckoutOpen(true)} disabled={saleItems.length === 0}>Finalizar Pedido</Button>
              <Button variant="outline" className="w-full" onClick={handleCancelSale} disabled={saleItems.length === 0}>Cancelar Pedido</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} totalAmount={totalAmount} onConfirm={(details) => saleMutation.mutate(details)} isPending={saleMutation.isPending} />
      <PostSaleModal saleData={postSaleData} onClose={() => setPostSaleData(null)} />
    </>
  );
}
