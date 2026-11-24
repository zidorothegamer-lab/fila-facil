/* Fila Fácil – funções compartilhadas entre as telas */
(function () {
  "use strict";
  var C = window.FILA_CONFIG || {};

  // Cria elementos sem nunca interpretar texto como HTML
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) {
        if (x == null || x === false) return;
        el.appendChild(typeof x === "string" || typeof x === "number" ? document.createTextNode(String(x)) : x);
      });
    }
    return el;
  }

  function media(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }

  /* Organiza a lista bruta e calcula os indicadores.
     Atendimento em um caixa, por ordem de chegada (FIFO):
     início do atendimento = maior valor entre a chegada da pessoa e o fim do atendimento anterior. */
  function analisar(lista, agora) {
    var todos = lista.filter(function (e) { return e.entrada != null; })
      .sort(function (a, b) { return a.entrada - b.entrada || (a.id < b.id ? -1 : 1); });
    todos.forEach(function (e, i) { e.senha = i + 1; e.inicio = null; e.espera = null; e.servico = null; });

    var fila = todos.filter(function (e) { return e.status === "aguardando"; });
    var fechados = todos.filter(function (e) { return (e.status === "atendido" || e.status === "rejeitado") && e.fim != null; })
      .sort(function (a, b) { return a.fim - b.fim; });
    var desist = todos.filter(function (e) { return e.status === "desistiu" && e.fim != null; });

    var anterior = null;
    fechados.forEach(function (e) {
      e.inicio = Math.max(anterior == null ? e.entrada : anterior, e.entrada);
      e.espera = Math.max(0, e.inicio - e.entrada);
      e.servico = Math.max(0, e.fim - e.inicio);
      anterior = e.fim;
    });
    if (fila.length) fila[0].inicio = Math.max(anterior == null ? fila[0].entrada : anterior, fila[0].entrada);

    var atendidos = fechados.filter(function (e) { return e.status === "atendido"; });
    var rejeitados = fechados.filter(function (e) { return e.status === "rejeitado"; });
    var tmaReal = media(atendidos.map(function (e) { return e.servico; }));
    var tma = tmaReal != null ? Math.max(tmaReal, 10000) : (C.tempoMedioInicialMin || 2) * 60000;

    var primeira = todos.length ? todos[0].entrada : null;
    var horas = primeira != null ? Math.max(agora - primeira, 5 * 60000) / 3600000 : null;
    var lambda = horas ? todos.length / horas : null;           // chegadas por hora
    var mu = tmaReal != null ? 3600000 / tma : null;             // capacidade por hora
    var rho = lambda != null && mu != null ? lambda / mu : null; // ocupação
    var wqTeorica = rho != null && rho < 1 ? (rho / (mu - lambda)) * 3600000 : null; // M/M/1, em ms

    var saidas = atendidos.length + rejeitados.length + desist.length;
    var esperas = atendidos.map(function (e) { return e.espera; });

    return {
      todos: todos, fila: fila, atendidos: atendidos, rejeitados: rejeitados, desistencias: desist,
      tmaReal: tmaReal, tma: tma, lambda: lambda, mu: mu, rho: rho, wqTeorica: wqTeorica,
      esperaMedia: media(esperas),
      maiorEspera: esperas.length ? Math.max.apply(null, esperas) : null,
      abandono: saidas ? desist.length / saidas : null,
      tolerancia: media(desist.map(function (e) { return e.fim - e.entrada; })),
    };
  }

  function duracao(ms) {
    if (ms == null) return "–";
    var s = Math.round(ms / 1000);
    if (s < 60) return s + " s";
    var m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return r && m < 10 ? m + " min " + r + " s" : m + " min";
    return Math.floor(m / 60) + " h " + (m % 60) + " min";
  }
  function minutos(ms) { return Math.max(1, Math.round(ms / 60000)); }
  function hora(ms) {
    if (ms == null) return "–";
    var d = new Date(ms);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function senha(n) { return "#" + String(n).padStart(2, "0"); }
  function num(v, casas) { return v == null ? "–" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas || 0, minimumFractionDigits: casas || 0 }); }
  function pct(v) { return v == null ? "–" : Math.round(v * 100) + "%"; }

  function guardar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  function lerGuardado(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // Avisos no topo da página
  function aviso(tipo, texto) {
    var box = document.getElementById("avisos");
    if (!box) return;
    box.appendChild(h("div", { class: "aviso " + tipo, role: tipo === "erro" ? "alert" : "status" }, texto));
  }
  function avisoModo(store) {
    if (store.modo === "teste") aviso("teste", "Modo de teste: os dados ficam só neste navegador (abra várias abas para simular clientes). Para usar com celulares diferentes, configure o Firebase (veja o LEIA-ME).");
  }
  function avisoErro(e) {
    console.error(e);
    var cod = e && e.code ? " (" + e.code + ")" : "";
    aviso("erro", "Não foi possível conectar ao banco de dados" + cod + ". Confira o config.js e as regras do Firestore.");
  }

  window.FF = {
    C: C, h: h, analisar: analisar, duracao: duracao, minutos: minutos, hora: hora, senha: senha,
    num: num, pct: pct, guardar: guardar, lerGuardado: lerGuardado, aviso: aviso, avisoModo: avisoModo, avisoErro: avisoErro,
    nomeLoja: (C.loja && C.loja.nome) || "Lanchonete",
  };
})();
