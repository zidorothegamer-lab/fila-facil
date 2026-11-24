/* Fila Fácil – camada de dados.
   Com o Firebase configurado, usa o Cloud Firestore (tempo real entre celulares).
   Sem configuração, usa o armazenamento do navegador (modo de teste). */
(function () {
  "use strict";
  var C = window.FILA_CONFIG || {};
  var LOJA = (C.loja && C.loja.id) || "pedrao";
  var FB_VERSION = "10.12.2";
  var fb = C.firebase || {};
  var temFirebase = !!(fb.apiKey && fb.projectId);

  // ---------------- modo de teste (navegador) ----------------
  function lojaLocal() {
    var KEY = "filafacil-teste-" + LOJA;
    var subs = [];
    var ultimo = null;
    function bruto() { try { return localStorage.getItem(KEY) || "[]"; } catch (e) { return "[]"; } }
    function ler() { try { return JSON.parse(bruto()); } catch (e) { return []; } }
    function avisar() {
      ultimo = bruto();
      var lista = ler();
      subs.forEach(function (f) { f(JSON.parse(JSON.stringify(lista))); });
    }
    function gravar(lista) {
      try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { /* sem armazenamento */ }
      avisar();
    }
    window.addEventListener("storage", function (e) { if (e.key === KEY) avisar(); });
    setInterval(function () { if (bruto() !== ultimo) avisar(); }, 700);
    function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    return {
      modo: "teste",
      assinar: function (cb) {
        subs.push(cb);
        setTimeout(function () { cb(ler()); }, 0);
        return function () { subs = subs.filter(function (f) { return f !== cb; }); };
      },
      entrar: async function (nome) {
        var lista = ler();
        var t = { id: novoId(), nome: nome, status: "aguardando", entrada: Date.now(), fim: null };
        lista.push(t);
        gravar(lista);
        return t.id;
      },
      mudarStatus: async function (id, status) {
        var lista = ler();
        var t = lista.find(function (x) { return x.id === id; });
        if (!t) return;
        t.status = status;
        t.fim = status === "aguardando" ? null : Date.now();
        gravar(lista);
      },
      apagarTudo: async function () { gravar([]); },
    };
  }

  // ---------------- Firebase (Cloud Firestore) ----------------
  async function lojaFirebase() {
    var base = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";
    var mods = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-firestore.js")]);
    var A = mods[0], F = mods[1];
    var app = A.initializeApp(fb);
    var db = F.getFirestore(app);
    var col = F.collection(db, "lojas", LOJA, "fila");
    function ms(v) {
      if (v && typeof v.toMillis === "function") return v.toMillis();
      return typeof v === "number" ? v : null;
    }
    return {
      modo: "firebase",
      assinar: function (cb, erro) {
        return F.onSnapshot(col, function (snap) {
          cb(snap.docs.map(function (d) {
            var x = d.data({ serverTimestamps: "estimate" });
            return { id: d.id, nome: String(x.nome || ""), status: x.status, entrada: ms(x.entrada), fim: ms(x.fim) };
          }));
        }, function (e) { if (erro) erro(e); });
      },
      entrar: async function (nome) {
        var ref = F.doc(col);
        await F.setDoc(ref, { nome: nome, status: "aguardando", entrada: F.serverTimestamp(), fim: null });
        return ref.id;
      },
      mudarStatus: async function (id, status) {
        await F.updateDoc(F.doc(col, id), {
          status: status,
          fim: status === "aguardando" ? null : F.serverTimestamp(),
        });
      },
      apagarTudo: async function () {
        var snap = await F.getDocs(col);
        var docs = snap.docs;
        for (var i = 0; i < docs.length; i += 400) {
          var lote = F.writeBatch(db);
          docs.slice(i, i + 400).forEach(function (d) { lote.delete(d.ref); });
          await lote.commit();
        }
      },
    };
  }

  window.FilaStore = {
    loja: LOJA,
    abrir: function () { return temFirebase ? lojaFirebase() : Promise.resolve(lojaLocal()); },
  };
})();
