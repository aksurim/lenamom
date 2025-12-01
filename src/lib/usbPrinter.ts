import { toast } from 'sonner';

let usbDevice: USBDevice | null = null;

/**
 * Solicita ao usuário permissão para um dispositivo USB e o retorna.
 * Armazena o dispositivo em uma variável global para reutilização.
 * @returns {Promise<USBDevice>} O dispositivo USB selecionado pelo usuário.
 */
export const getUsbDevice = async (): Promise<USBDevice> => {
  try {
    if (!navigator.usb) {
      throw new Error("A API WebUSB não é suportada por este navegador. Use o Google Chrome ou Edge.");
    }
    
    // Pede ao usuário para selecionar um dispositivo
    const device = await navigator.usb.requestDevice({ filters: [] });
    if (!device) {
      throw new Error("Nenhum dispositivo USB foi selecionado.");
    }
    
    usbDevice = device; // Armazena para uso futuro
    return device;

  } catch (error: any) {
    console.error("Erro ao solicitar dispositivo USB:", error);
    toast.error(error.message || "Falha ao obter permissão para o dispositivo USB.");
    throw error;
  }
};

/**
 * Envia um comando TSPL para um dispositivo USB já autorizado.
 * @param {USBDevice} device O dispositivo USB obtido através de getUsbDevice.
 * @param {string} tsplCommand A string de comando TSPL a ser enviada.
 */
export const sendTsplOverUsb = async (device: USBDevice, tsplCommand: string): Promise<void> => {
  try {
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
    toast.error(error.message || "Falha ao enviar dados para a impressora USB.");
    throw error;
  } finally {
    // É importante fechar o dispositivo após o uso para liberá-lo.
    if (device.opened) {
      await device.close();
    }
  }
};
