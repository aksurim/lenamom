/**
 * Solicita ao usuário a seleção de um dispositivo USB e estabelece uma conexão.
 * @returns {Promise<USBDevice | null>} O dispositivo conectado ou null se nenhum for selecionado.
 */
export const requestAndConnectDevice = async (): Promise<USBDevice | null> => {
  if (!navigator.usb) {
    throw new Error("A API WebUSB não é suportada por este navegador. Use o Google Chrome ou Edge.");
  }
  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    if (!device) return null;

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);
    console.log("Dispositivo conectado e interface reivindicada.");
    return device;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      console.log("Nenhum dispositivo selecionado pelo usuário.");
      return null;
    }
    // Relança outros erros para serem tratados pelo chamador.
    throw error;
  }
};

/**
 * Envia uma string de comando TSPL para um dispositivo USB já conectado.
 * @param {USBDevice} device O dispositivo USB para o qual enviar os dados.
 * @param {string} tsplCommand A string de comando TSPL.
 */
export const sendDataToDevice = async (device: USBDevice, tsplCommand: string): Promise<void> => {
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
};

/**
 * Fecha a conexão com um dispositivo USB.
 * @param {USBDevice | null} device O dispositivo a ser desconectado.
 */
export const closeDevice = async (device: USBDevice | null): Promise<void> => {
  if (device && device.opened) {
    try {
      await device.close();
      console.log("Conexão com o dispositivo USB fechada.");
    } catch (error) {
      console.error("Erro ao fechar o dispositivo USB:", error);
    }
  }
};
