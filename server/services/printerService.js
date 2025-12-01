const net = require('net');
require('dotenv').config();

/**
 * Envia uma string de comando bruto (TSPL) para uma impressora térmica via Socket TCP/IP.
 * As configurações de IP e Porta são lidas do arquivo .env.
 *
 * @param {string} command A string completa de comandos TSPL a ser enviada.
 * @returns {Promise<void>} Uma Promise que resolve se o comando for enviado com sucesso, ou rejeita em caso de erro.
 */
const sendCommandToPrinter = (command) => {
  return new Promise((resolve, reject) => {
    const printerIP = process.env.PRINTER_IP;
    const printerPort = process.env.PRINTER_PORT || 9100;

    if (!printerIP) {
      console.error("Erro de impressão: O endereço IP da impressora (PRINTER_IP) não está definido no arquivo .env.");
      return reject(new Error("PRINTER_IP não configurado."));
    }

    const client = new net.Socket();

    client.connect(printerPort, printerIP, () => {
      console.log(`Conectado à impressora em ${printerIP}:${printerPort}`);
      client.write(command, 'utf8', (err) => {
        if (err) {
          console.error("Erro ao enviar comando para a impressora:", err);
          client.destroy();
          return reject(err);
        }
        console.log("Comando enviado com sucesso.");
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      console.error("Erro de conexão com a impressora:", err.message);
      client.destroy();
      reject(err);
    });

    client.on('close', () => {
      console.log('Conexão com a impressora fechada.');
    });
  });
};

module.exports = {
  sendCommandToPrinter,
};
