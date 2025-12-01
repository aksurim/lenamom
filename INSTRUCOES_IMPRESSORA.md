# Guia de Configuração da Impressora Térmica para o Sistema LENAMOM

Este guia rápido mostra como configurar sua impressora térmica para permitir que o sistema LENAMOM imprima etiquetas e cupons diretamente, sem a necessidade de drivers complexos.

**Este procedimento só precisa ser feito UMA ÚNICA VEZ em cada computador que for utilizar a impressão.**

### Passo 1: Baixar o Utilitário Zadig

1.  Acesse o site oficial do Zadig: **https://zadig.akeo.ie/**
2.  Clique no link de download mais recente para baixar o arquivo. Ele será um executável (ex: `zadig_2.8.exe`) que não precisa ser instalado.

### Passo 2: Preparar a Impressora

1.  Conecte sua impressora térmica (ex: Tomate MDK-006) ao computador pela porta **USB**.
2.  Ligue a impressora e certifique-se de que ela está pronta (sem luzes de erro piscando).

### Passo 3: Substituir o Driver com o Zadig

1.  Execute o arquivo **Zadig** que você baixou. O Windows pode pedir permissão de administrador. Confirme.

2.  No menu do Zadig, vá em **Options** e clique na opção **List All Devices**. (Este é o passo mais importante).

    ![Marcar List All Devices](https://i.imgur.com/h3GfQ4h.png)

3.  No menu de seleção principal (dropdown), procure e selecione sua impressora. O nome pode ser **"LabelPrinter"**, **"MDK-006"** ou algo similar.

4.  Você verá uma seta verde. À direita dela, existem dois campos. O da direita mostra o driver que será instalado. Clique nas pequenas setas para cima/baixo até selecionar **WinUSB**.

    A linha deve ficar assim:
    `[Nome da sua Impressora] | (Driver Atual)  -->  WinUSB`

    ![Selecionar WinUSB](https://i.imgur.com/sHsnLEL.png)

5.  Clique no botão grande **Replace Driver**.

6.  Aguarde a mensagem de sucesso. O processo pode levar um minuto.

### Pronto!

É isso! Sua impressora agora está configurada para aceitar comandos diretos do sistema LENAMOM através do navegador (Google Chrome ou Microsoft Edge). Você pode fechar o Zadig.

Ao imprimir pela primeira vez no sistema, o navegador irá pedir sua permissão para se conectar ao dispositivo USB. Apenas clique na sua impressora e em "Conectar".
