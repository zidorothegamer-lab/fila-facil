/* =====================================================================
   FILA FÁCIL – CONFIGURAÇÃO DO PROTÓTIPO
   Este é o único arquivo que você precisa editar.
   ===================================================================== */
window.FILA_CONFIG = {

  // Dados do estabelecimento
  loja: {
    id: "pedrao",                    // identificador interno (sem espaços nem acentos)
    nome: "Lanchonete do Pedrão",
  },

  // Senha da tela do caixa (caixa.html). Troque antes de apresentar.
  senhaCaixa: "1234",

  // Tempo médio de atendimento usado na estimativa até o primeiro
  // atendimento do dia (em minutos). Depois o sistema calcula sozinho.
  tempoMedioInicialMin: 2,

  // Cole aqui o bloco "firebaseConfig" do seu projeto no Firebase
  // (passo 2 do LEIA-ME). Enquanto apiKey estiver vazio, o protótipo
  // roda em MODO DE TESTE: os dados ficam só no navegador deste aparelho.
  firebase: {
    apiKey: "AIzaSyDLyWvmOju_9wiFtv-waK32jfTtuRh5JPo",
    authDomain: "fila-facil-7715f.firebaseapp.com",
    projectId: "fila-facil-7715f",
    storageBucket: "fila-facil-7715f.firebasestorage.app",
    messagingSenderId: "195916601209",
    appId: "1:195916601209:web:d4cb45ecc6f7c63b7fc1a8",
  },
};
