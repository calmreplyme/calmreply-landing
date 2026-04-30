const form = document.querySelector("#messageForm");
const messageInput = document.querySelector("#incomingMessage");
const childNameInput = document.querySelector("#childName");
const clearButton = document.querySelector("#clearButton");
const statusBadge = document.querySelector("#analysisStatus");
const emptyState = document.querySelector("#emptyState");
const results = document.querySelector("#results");
const scoreStrip = document.querySelector("#scoreStrip");
const signalGrid = document.querySelector("#signalGrid");
const adviceList = document.querySelector("#adviceList");
const responseList = document.querySelector("#responseList");

const patterns = {
  urgency: ["urgent", "urgence", "tout de suite", "maintenant", "ce soir", "demain", "aujourd hui", "retard", "dernier delai"],
  conflict: ["encore", "toujours", "jamais", "nul", "nulle", "minable", "lamentable", "irresponsable", "egoiste", "incapable", "incompetent", "honte", "mensonge", "menteur", "menteuse", "ridicule", "toxique", "manipulateur", "manipulatrice", "mauvais pere", "mauvaise mere", "tu t'en fous", "tu t en fous", "tu te fous de moi", "vous vous foutez de moi"],
  pressure: ["si tu aimais", "a cause de toi", "tu me dois", "je vais dire aux enfants", "les enfants sauront", "tu vas le regretter", "tu vas voir", "je vais te faire payer", "je vais demander la garde", "dernier avertissement", "je te previens"],
  legal: ["avocat", "tribunal", "juge", "plainte", "police", "procedure", "garde exclusive", "autorite parentale"],
  logistics: ["garde", "horaire", "heure", "ecole", "creche", "activite", "vacances", "week-end", "weekend", "rendez-vous", "rdv", "trajet", "recuperer", "deposer", "chercher", "ramener"],
  money: ["payer", "paye", "paiement", "argent", "montant", "somme", "dois", "devez", "facture", "frais", "pension", "contribution", "rembourser", "remboursement", "virement", "versement", "regulier", "mensuel", "chaque mois", "convenu"],
};

const signalCopy = {
  urgency: ["Urgence ou délai", "Pas de pression temporelle nette.", "Un délai ou une urgence possible apparaît.", "Le message demande une réaction rapide."],
  conflict: ["Charge émotionnelle", "Le ton semble peu conflictuel.", "Le message contient des reproches ou généralisations.", "Le message est agressif ou fortement accusatoire."],
  pressure: ["Pression relationnelle", "Peu de pression affective détectée.", "Des formulations peuvent pousser à répondre à chaud.", "Le message contient une pression personnelle forte."],
  legal: ["Juridique ou menace", "Aucun signal juridique net.", "Une référence juridique ou institutionnelle apparaît.", "Le message évoque tribunal, police ou procédure."],
  logistics: ["Logistique enfant", "Peu d'éléments pratiques identifiables.", "Un sujet d'organisation semble présent.", "Le message porte surtout sur l'organisation."],
  money: ["Paiement ou frais", "Pas de sujet financier clair.", "Un point financier est mentionné.", "Le message insiste sur un paiement ou remboursement."],
};

function normalizeText(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
}

function countMatches(text, items) {
  return items.reduce((count, item) => count + (text.includes(normalizeText(item)) ? 1 : 0), 0);
}

function level(score, highAt = 2) {
  if (score >= highAt) return "high";
  if (score > 0) return "medium";
  return "low";
}

function levelLabel(value) {
  return value === "high" ? "Élevé" : value === "medium" ? "À surveiller" : "Faible";
}

function percent(value, max) {
  return Math.min(100, Math.round((value / max) * 100));
}

function detectMoney(text) {
  const amountMatch = text.match(/\b(?:chf|eur|euros?|francs?)\s*\d+(?:[.,]\d{1,2})?\b|\b\d+(?:[.,]\d{1,2})?\s*(?:chf|eur|euros?|francs?|€)\b/);
  const hasAmount = Boolean(amountMatch);
  const isRegular = /\b(regulier|mensuel|chaque mois|tous les mois|pension|contribution|montant convenu|montant fixe|comme convenu|comme prevu|habituel|versement mensuel)\b/.test(text);
  const isOwedByUser = /\b(tu|vous)\s+(me\s+)?(dois|devez)\b/.test(text) || /\b(tu|vous)\s+n[' ]?(as|avez)\s+(toujours\s+)?pas\s+paye\b/.test(text) || /\bpas encore paye\b/.test(text) || /\ben retard\b/.test(text);
  const isPaymentRequest = /\b(payer|paye|payez|paie|verse|verser|virement|regler|reglement|pension|contribution|paiement|versement)\b/.test(text);
  const isExpense = /\b(facture|justificatif|ticket|recu|frais de|frais pour|depense|avance|rembourser|remboursement)\b/.test(text);
  const isAgreedPayment = (isOwedByUser || isPaymentRequest) && (isRegular || /\bconvenu\b/.test(text) || (hasAmount && !isExpense));

  return {
    amount: amountMatch?.[0] || "",
    hasAmount,
    isRegular,
    isOwedByUser,
    isPaymentRequest,
    isExpense,
    isAgreedPayment,
    isExpenseReimbursement: isExpense && !isAgreedPayment,
  };
}

function detectSpecificity(text) {
  const dateMatch = text.match(/\b(aujourd'hui|aujourd hui|demain|apres-demain|apres demain|ce soir|ce matin|cet apres-midi|cet apres midi|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|week-end|weekend)\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/);
  const timeMatch = text.match(/\b(?:[01]?\d|2[0-3])\s*(?:h|:)\s*(?:[0-5]\d)?\b/);
  const hasPlace = /\b(ecole|creche|maison|chez moi|chez toi|chez vous|devant|parking|gare|adresse|lieu|cabinet|club|terrain)\b/.test(text);
  const hasAction = /\b(venir chercher|viens chercher|venez chercher|recuperer|deposer|ramener|amener|garder|prendre|passer|venir|viens|venez|payer|rembourser|envoyer|appeler|confirmer|organiser)\b/.test(text);
  const hasInstruction = /\b(merci de|il faut|tu dois|vous devez|tu viens|vous venez|organise-toi|organise toi|debrouille-toi|debrouille toi|sois la|soyez la|je ne peux pas|je peux pas|confirme|confirmez|fais le virement)\b/.test(text);
  const money = detectMoney(text);
  const score = [dateMatch, timeMatch, hasPlace, hasAction, hasInstruction, money.hasAmount || money.isRegular || money.isAgreedPayment].filter(Boolean).length;

  return {
    score,
    isPrecise: money.isAgreedPayment || (money.hasAmount && money.isPaymentRequest) || score >= 3 || (score >= 2 && (hasInstruction || hasAction)),
    details: {
      date: formatDate(dateMatch?.[0]),
      time: timeMatch?.[0]?.replace(/\s+/g, "") || "",
      place: formatPlace(text),
    },
    money,
  };
}

function formatDate(value) {
  const labels = {
    "aujourd'hui": "aujourd'hui",
    "aujourd hui": "aujourd'hui",
    demain: "demain",
    "apres-demain": "après-demain",
    "apres demain": "après-demain",
    "ce soir": "ce soir",
    "ce matin": "ce matin",
    "cet apres-midi": "cet après-midi",
    "cet apres midi": "cet après-midi",
    "week-end": "ce week-end",
    weekend: "ce week-end",
  };
  return value ? labels[value] || value : "";
}

function formatPlace(text) {
  if (/\bchez moi\b/.test(text)) return "chez moi";
  if (/\bchez toi\b/.test(text)) return "chez toi";
  if (/\bchez vous\b/.test(text)) return "chez vous";
  if (/\becole\b/.test(text)) return "à l'école";
  if (/\bcreche\b/.test(text)) return "à la crèche";
  if (/\bmaison\b/.test(text)) return "à la maison";
  if (/\bparking\b/.test(text)) return "au parking";
  if (/\bgare\b/.test(text)) return "à la gare";
  if (/\bcabinet\b/.test(text)) return "au cabinet";
  if (/\bclub\b/.test(text)) return "au club";
  if (/\bterrain\b/.test(text)) return "au terrain";
  return "";
}

function formatAmount(amount) {
  return (amount || "").replace(/\bchf\b/i, "CHF").replace(/\beur\b/i, "EUR").replace(/\beuros?\b/i, "EUR").replace(/\bfrancs?\b/i, "CHF");
}

function childRef(name) {
  return name ? name.trim() : "[prénom de l'enfant]";
}

function childWithDe(child) {
  if (child.startsWith("[")) return `de ${child}`;
  return /^[aeiouyhàâäéèêëîïôöùûüÿ]/i.test(child) ? `d'${child}` : `de ${child}`;
}

function dueDate(analysis) {
  const date = analysis.specificity.details.date;
  if (!date) return "le [date]";
  return /^\d/.test(date) ? `le ${date}` : date;
}

function requestPoint(analysis, child) {
  const money = analysis.money;
  const amount = formatAmount(money.amount);
  if (money.isExpenseReimbursement) return amount ? `les frais de ${amount}` : "les frais à rembourser";
  if (money.isAgreedPayment) return money.isRegular ? amount ? `le paiement régulier convenu de ${amount}` : "le paiement régulier convenu" : amount ? `le paiement de ${amount}` : "le paiement dû";
  const parts = [];
  if (analysis.specificity.details.date) parts.push(analysis.specificity.details.date);
  if (analysis.specificity.details.time) parts.push(`à ${analysis.specificity.details.time}`);
  if (analysis.specificity.details.place) parts.push(analysis.specificity.details.place);
  return parts.length ? `${child} ${parts.join(" ")}` : `ce point concernant ${child}`;
}

function analyzeMessage(rawMessage) {
  const text = normalizeText(rawMessage);
  const exclamationCount = (rawMessage.match(/!/g) || []).length;
  const uppercaseWords = (rawMessage.match(/\b[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]{3,}\b/g) || []).length;
  const directDemand = /\b(peux-tu|peux tu|tu peux|merci de|il faut|je veux|donne-moi|donne moi|organise-toi|organise toi|debrouille-toi|debrouille toi|confirme|confirmez|reponds|repondez|fais le virement)\b/.test(text);
  const questionCount = (rawMessage.match(/\?/g) || []).length;
  const secondPersonAttack = /\b(tu|vous)\s+(es|etes|as|avez|fais|fait|penses|ne penses|ne fais|n'es|n'etes)\b/.test(text);
  const absoluteBlame = /\b(tu|vous).{0,36}\b(toujours|jamais|encore)\b/.test(text);
  const insultingFrame = /\b(n'importe quoi|tes conneries|vos conneries|fous de moi|foutez de moi)\b/.test(text);
  const specificity = detectSpecificity(text);
  const scores = Object.fromEntries(Object.entries(patterns).map(([key, list]) => [key, countMatches(text, list)]));

  scores.conflict += exclamationCount > 2 ? 1 : 0;
  scores.conflict += uppercaseWords > 1 ? 1 : 0;
  scores.conflict += secondPersonAttack ? 1 : 0;
  scores.conflict += absoluteBlame ? 1 : 0;
  scores.conflict += insultingFrame ? 2 : 0;
  scores.urgency += directDemand && scores.urgency > 0 ? 1 : 0;
  scores.logistics += directDemand && scores.logistics > 0 ? 1 : 0;

  return {
    text,
    hasQuestion: questionCount > 0 || directDemand,
    specificity,
    money: specificity.money,
    scores,
    levels: {
      urgency: level(scores.urgency, 3),
      conflict: level(scores.conflict, 2),
      pressure: level(scores.pressure, 2),
      legal: level(scores.legal, 2),
      logistics: level(scores.logistics, 3),
      money: level(scores.money, 2),
    },
    meters: {
      conflict: percent(scores.conflict, 5),
      urgency: percent(scores.urgency, 5),
      clarity: Math.max(18, Math.min(100, 28 + (scores.logistics + scores.money + scores.urgency + specificity.score) * 14)),
    },
    isHostile: scores.conflict >= 2 || scores.pressure >= 2 || insultingFrame,
  };
}

function contextLabel(analysis) {
  if (analysis.money.isAgreedPayment) return "paiement";
  if (analysis.scores.urgency > 1) return "urgence";
  if (analysis.scores.money > 0) return "frais";
  if (analysis.scores.logistics > 0) return "organisation";
  return analysis.hasQuestion ? "demande" : "message";
}

function address(mode) {
  const vous = mode === "vous";
  return {
    your: vous ? "votre" : "ton",
    have: vous ? "vous avez" : "tu as",
    confirm: vous ? "je vous confirme" : "je te confirme",
    confirmation: vous ? "Je vous envoie la confirmation." : "Je t'envoie la confirmation.",
    confirmationFuture: vous ? "je vous enverrai la confirmation" : "je t'enverrai la confirmation",
    contact: vous ? "contactez" : "contacte",
    keep: vous ? "Tenez-moi informé" : "Tiens-moi informé",
  };
}

function buildAdvice(analysis, context) {
  const advice = analysis.isHostile
    ? [
        "Ne pas se défendre point par point: cela nourrit l'escalade.",
        "Répondre une seule fois, très court, uniquement sur l'enfant ou sur la demande concrète.",
        "Nommer la limite sans attaquer en retour: pas d'insulte, pas de reproche, pas de diagnostic.",
      ]
    : [
        "Répondre uniquement au point utile pour l'enfant et laisser de côté les reproches.",
        "Écrire une réponse courte: fait concret, proposition, prochaine étape.",
      ];

  if (analysis.money.isAgreedPayment) advice.unshift("Répondre sur le paiement convenu: confirmer le virement, la date ou l'état du paiement.");
  if (analysis.money.isExpenseReimbursement) advice.push("Répondre sur le remboursement: confirmer le paiement, la date ou le désaccord concret.");
  if (analysis.levels.conflict !== "low" || analysis.levels.pressure !== "low") advice.push("Attendre quelques minutes avant l'envoi et retirer toute phrase défensive.");
  if (analysis.levels.legal !== "low") advice.push("Garder une trace du message et éviter toute admission ou accusation dans la réponse.");
  if (context === "frais" && !analysis.money.isExpenseReimbursement) advice.push("Demander une facture ou un justificatif et proposer un délai clair de traitement.");
  if (!analysis.hasQuestion && analysis.scores.logistics === 0 && analysis.scores.money === 0) advice.push("S'il n'y a pas de demande concrète, ne pas répondre peut être la meilleure réponse.");
  return [...new Set(advice)].slice(0, 5);
}

function buildPaymentResponses(analysis, copy, hostile) {
  const point = requestPoint(analysis, "");
  const date = dueDate(analysis);
  const suffix = hostile ? " Je ne répondrai pas aux reproches personnels." : "";
  return [
    { title: "Paiement prévu", body: `J'ai bien noté pour ${point}. Je fais le virement ${date}.${suffix}` },
    { title: "Si déjà payé", body: `Le virement pour ${point} a été effectué le [date]. ${copy.confirmation}${hostile ? " Je ne répondrai pas au reste du message." : ""}` },
    { title: "Si tu as du retard", body: `Je reconnais le retard sur ${point}. Je le règle ${date}.` },
    { title: "Limite sur le ton", body: `Je traiterai ${point} ${date}. Je ne poursuivrai pas l'échange sur les reproches personnels.` },
  ];
}

function buildExpenseResponses(analysis, copy, hostile) {
  const point = requestPoint(analysis, "");
  const date = dueDate(analysis);
  const suffix = hostile ? " Je ne répondrai pas aux reproches personnels." : "";
  return [
    { title: "Remboursement prévu", body: `J'ai bien noté ${point}. Je rembourse ma part ${date}.${suffix}` },
    { title: "Si déjà remboursé", body: `Le remboursement concernant ${point} a été effectué le [date]. ${copy.confirmation}` },
    { title: "Si désaccord", body: `Je ne suis pas d'accord avec ${point}. Je propose de vérifier le partage prévu et de rester sur ce point concret.` },
    { title: "Limite sur le ton", body: `Je traiterai ${point} de façon factuelle. Je ne poursuivrai pas l'échange sur les reproches personnels.` },
  ];
}

function buildResponses(analysis, options) {
  const child = childRef(options.childName);
  const copy = address(options.addressMode);
  const point = requestPoint(analysis, child);

  if (analysis.money.isAgreedPayment) return buildPaymentResponses(analysis, copy, analysis.isHostile).slice(0, 4);
  if (analysis.money.isExpenseReimbursement) return buildExpenseResponses(analysis, copy, analysis.isHostile).slice(0, 4);

  const responses = [];
  if (analysis.isHostile && analysis.specificity.isPrecise) {
    responses.push(
      { title: "Réponse au fond", body: `Je réponds au point concernant ${point}: [réponse factuelle]. Je ne répondrai pas aux reproches personnels.` },
      { title: "Accord", body: `D'accord pour ${point}. Je m'en occupe. Je ne répondrai pas au reste du message.` },
      { title: "Refus ou alternative", body: `Je ne peux pas accepter cette organisation pour ${point}. Je propose [alternative concrète]. Je reste sur l'organisation ${childWithDe(child)}.` },
    );
  } else if (analysis.isHostile) {
    responses.push({ title: "Limite recommandée", body: `Je ne poursuivrai pas cet échange sous cette forme. Si ${copy.have} une demande concrète concernant ${child}, merci de la formuler avec date, heure, lieu et décision attendue.` });
  } else {
    const context = contextLabel(analysis);
    responses.push({
      title: "Calme et pratique",
      body: analysis.specificity.isPrecise
        ? `J'ai bien reçu ${copy.your} message. Je réponds au point concernant ${point}: [réponse factuelle].`
        : context === "urgence"
          ? `J'ai bien reçu ${copy.your} message. Pour ${child}, je peux m'organiser sur le point urgent suivant: [point concret]. Merci de me confirmer [heure/lieu/information].`
          : `J'ai bien reçu ${copy.your} message. Pour ${child}, je propose ceci: [proposition concrète]. Merci de me confirmer si cela convient.`,
    });
    if (analysis.specificity.isPrecise) responses.push({ title: "Accord", body: `D'accord pour ${point}.` }, { title: "Refus ou alternative", body: `Je ne peux pas accepter cette organisation pour ${point}. Je propose [alternative concrète].` });
  }

  if (!analysis.specificity.isPrecise && (analysis.hasQuestion || analysis.scores.logistics > 0)) responses.push({ title: "Clarification", body: `Pour éviter un malentendu, merci de préciser [date], [heure] et [lieu/information] concernant ${child}.` });
  if (analysis.levels.urgency !== "low" && !analysis.money.isAgreedPayment) responses.push({ title: "Urgence", body: `J'ai vu l'urgence. Je peux faire [action possible] maintenant pour ${child}. ${copy.keep} des informations utiles.` });
  if (responses.length < 3) responses.push({ title: "Très court", body: `Bien reçu. Pour ${child}: [réponse concrète].` });
  return responses.slice(0, 4);
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Browsers can block Clipboard API on local files.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function renderScores(analysis) {
  const cards = [["Charge", analysis.meters.conflict, "conflict"], ["Urgence", analysis.meters.urgency, "urgency"], ["Clarté", analysis.meters.clarity, "clarity"]];
  scoreStrip.innerHTML = cards.map(([label, value, type]) => `<article class="score-card"><div class="score-label">${label}</div><strong>${value}%</strong><div class="meter ${type}" aria-hidden="true"><span style="width: ${value}%"></span></div></article>`).join("");
}

function renderSignals(analysis) {
  signalGrid.innerHTML = Object.keys(signalCopy).map((key) => {
    const current = analysis.levels[key];
    const index = current === "high" ? 3 : current === "medium" ? 2 : 1;
    const tagClass = current === "high" ? "tag-high" : current === "medium" ? "tag-medium" : "tag-low";
    return `<article class="signal-card"><span class="signal-tag ${tagClass}">${levelLabel(current)}</span><strong>${signalCopy[key][0]}</strong><p>${signalCopy[key][index]}</p></article>`;
  }).join("");
}

function renderAdvice(advice) {
  adviceList.innerHTML = advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderResponses(responses) {
  responseList.innerHTML = responses.map((response, index) => `<article class="response-card"><div class="response-head"><h3>${escapeHtml(response.title)}</h3><button class="copy-button" type="button" data-copy-index="${index}"><span aria-hidden="true">⧉</span> Copier</button></div><p>${escapeHtml(response.body)}</p></article>`).join("");
  responseList.querySelectorAll("[data-copy-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const response = responses[Number(button.dataset.copyIndex)];
      await copyText(response.body);
      button.textContent = "Copié";
      setTimeout(() => {
        button.innerHTML = '<span aria-hidden="true">⧉</span> Copier';
      }, 1400);
    });
  });
}

function getOptions() {
  const data = new FormData(form);
  return {
    addressMode: data.get("addressMode"),
    answerLength: data.get("answerLength"),
    childName: childNameInput.value.trim(),
  };
}

function runAnalysis() {
  const rawMessage = messageInput.value.trim();
  if (!rawMessage) {
    messageInput.focus();
    statusBadge.textContent = "Message vide";
    return;
  }
  const analysis = analyzeMessage(rawMessage);
  const context = contextLabel(analysis);
  const responses = buildResponses(analysis, getOptions());
  renderScores(analysis);
  renderSignals(analysis);
  renderAdvice(buildAdvice(analysis, context));
  renderResponses(responses);
  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
  statusBadge.textContent = "Analysé";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runAnalysis();
});

clearButton.addEventListener("click", () => {
  form.reset();
  messageInput.value = "";
  childNameInput.value = "";
  results.classList.add("hidden");
  emptyState.classList.remove("hidden");
  statusBadge.textContent = "Prêt";
  messageInput.focus();
});

messageInput.addEventListener("input", () => {
  statusBadge.textContent = messageInput.value.trim() ? "À analyser" : "Prêt";
});
