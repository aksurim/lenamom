import { toast } from 'sonner';

/**
 * Solicita um dispositivo USB ao usuário.
 * Esta função é interna ao módulo.
 * @returns {Promise<USBDevice>} O dispositivo USB selecionado pelo usuário.
 */
const requestUsbDevice = async (): Promise<USBDevice> => {
  if (!navigator.usb) {
    throw new Error("A API WebUSB não é suportada por este navegador. Use o Google Chrome ou Edge.");
  }
  
  // Pede ao usuário para selecionar um dispositivo.
  // O navegador geralmente lembra das permissões concedidas.
  const device = await navigator.usb.requestDevice({ filters: [] });
  if (!device) {
    throw new Error("Nenhum dispositivo USB foi selecionado.");
  }
  
  return device;
};

/**
 * Envia um comando TSPL para uma impressora USB.
 * Esta função gerencia todo o ciclo: solicitar dispositivo, abrir, enviar dados e fechar.
 * @param {string} tsplCommand A string de comando TSPL a ser enviada.
 */
export const sendTsplOverUsb = async (tsplCommand: string): Promise<void> => {
  let device: USBDevice | null = null;
  try {
    // Passo 1: Solicita o dispositivo ao usuário.
    device = await requestUsbDevice();

    // Passo 2: Abre a conexão, configura e envia os dados.
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    const endpointOut = device.configuration?.interfaces[0]?.alternate.endpoints.find(
      e => e.direction === 'out'
    );

    if (!endpointOut) {
      throw new Error("Endpoint de saída não encontrado no dispositivo USB.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(tsplCommand);

    await device.transferOut(endpointOut.endpointNumber, data);
    console.log("Comando TSPL enviado com sucesso para o dispositivo.");

  } catch (error: any) {
    console.error("Erro durante a transferência de dados USB:", error);
    // O erro será relançado para ser capturado pelo toast.promise no chamador (Sales.tsx).
    // Isso evita mensagens de erro duplicadas.
    throw error;
  } finally {
    // Passo 3: Garante que o dispositivo seja fechado para liberá-lo.
    if (device && device.opened) {
      await device.close();
    }
  }
};
