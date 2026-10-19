(() => {
  const sourceLanguage = DATA.presentation?.language || 'en';
  const dictionaries = DATA.translations || {};
  const languages = [...new Set(DATA.presentation?.languages || [sourceLanguage, ...Object.keys(dictionaries)])];
  if (languages.length < 2) return;

  const interfaceNl = JSON.parse(document.getElementById('interface-translations').textContent);
  const interfaceEn = Object.fromEntries(Object.entries(interfaceNl).map(([en, nl]) => [nl, en]));
  const interfaceByLanguage = { nl: interfaceNl, en: interfaceEn };
  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  const searchVariants = new WeakMap();
  const excluded = 'script, style, pre, code, .ev, .where, .explain-evidence, [data-no-translate], #mod option:not([value=""]), .tag:not([class*="r-"])';
  const preferenceKey = 'pdv_language_v1:' + (DATA.meta?.title || 'project');
  const control = document.getElementById('language-switch');
  let language = sourceLanguage;
  let scheduled = false;

  function lookup(dictionary, key) {
    return dictionary && Object.hasOwn(dictionary, key) && typeof dictionary[key] === 'string' ? dictionary[key] : undefined;
  }

  function translate(source) {
    const value = source.trim();
    const custom = language === sourceLanguage ? {} : dictionaries[language] || {};
    let translated = lookup(custom, value) ?? lookup(interfaceByLanguage[language], value);
    const cockpitLabel = value.match(/^(🟢|🟡|🔴) (.+)$/u);
    if (translated === undefined && cockpitLabel) translated = cockpitLabel[1] + ' ' + (lookup(custom, cockpitLabel[2]) ?? lookup(interfaceByLanguage[language], cockpitLabel[2]) ?? cockpitLabel[2]);
    if (translated === undefined && / — Overview$/.test(value)) {
      const title = value.slice(0, -11);
      translated = (lookup(custom, title) ?? title) + (language === 'nl' ? ' — Overzicht' : ' — Overview');
    }
    if (translated === undefined && /^working tree /.test(value)) translated = value.replace(/^working tree /, language === 'nl' ? 'werkboom ' : 'working tree ');
    if (translated === undefined && /^\(\d+\/\d+ done\)$/.test(value)) translated = value.replace(' done)', language === 'nl' ? ' afgerond)' : ' done)');
    if (translated === undefined && /^(Include |Toon )(VERIFIED|INFERRED|UNKNOWN)$/.test(value)) translated = value.replace(/^(Include |Toon )/, language === 'nl' ? 'Toon ' : 'Include ');
    if (translated === undefined && /^confidence: /.test(value)) translated = value.replace('confidence: ', language === 'nl' ? 'zekerheid: ' : 'confidence: ');
    if (translated === undefined && /^risk:/.test(value)) translated = value.replace('risk:', language === 'nl' ? 'risico:' : 'risk:');
    if (translated === undefined && /^(Proposal|Voorstel)( · [\w]+)?:$/.test(value)) {
      const pieces = value.slice(0, -1).split(' · ');
      translated = (language === 'nl' ? 'Voorstel' : 'Proposal') + (pieces[1] ? ' · ' + (lookup(interfaceByLanguage[language], pieces[1]) ?? pieces[1]) : '') + ':';
    }
    if (translated === undefined) return source;
    const prefix = /^[.,;:!?]/.test(translated) ? '' : source.match(/^\s*/)[0];
    return prefix + translated + source.match(/\s*$/)[0];
  }

  function translateTextNode(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    let record = textRecords.get(node);
    if (!record || node.nodeValue !== record.rendered) record = { source: node.nodeValue, rendered: node.nodeValue };
    const value = translate(record.source);
    if (node.nodeValue !== value) node.nodeValue = value;
    record.rendered = value;
    textRecords.set(node, record);
  }

  function translateAttributes(element) {
    if (element.closest(excluded)) return;
    const records = attributeRecords.get(element) || new Map();
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      let record = records.get(name);
      if (!record || current !== record.rendered) record = { source: current, rendered: current };
      const value = translate(record.source);
      if (current !== value) element.setAttribute(name, value);
      record.rendered = value;
      records.set(name, record);
    }
    attributeRecords.set(element, records);
  }

  function updateSearchText() {
    document.querySelectorAll('details.sec .card').forEach(card => {
      const variants = searchVariants.get(card) || new Set([card.dataset.text || '']);
      variants.add(card.textContent.toLowerCase());
      searchVariants.set(card, variants);
      card.dataset.translatedText = [...variants].join(' ');
    });
  }

  function translateDocument() {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateTextNode(walker.currentNode);
    document.querySelectorAll('[aria-label], [title], [placeholder]').forEach(translateAttributes);
    updateSearchText();
  }

  function readingAnchor() {
    const elements = [...document.querySelectorAll('.wrap h1, .wrap h2, .wrap h3, .wrap h4, .wrap p, .wrap summary')];
    return elements.find(element => {
      const bounds = element.getBoundingClientRect();
      return /^H[1-4]$/.test(element.tagName) && bounds.height > 0 && bounds.top >= 0 && bounds.top < innerHeight;
    }) || elements.find(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    });
  }

  function setLanguage(next, preservePosition = true) {
    if (!languages.includes(next)) return;
    const anchor = preservePosition ? readingAnchor() : null;
    const top = anchor?.getBoundingClientRect().top;
    language = next;
    document.documentElement.lang = language;
    translateDocument();
    control.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    document.dispatchEvent(new Event('pdv-language-changed'));
    if (anchor && anchor.getBoundingClientRect().height) window.scrollBy({ top: anchor.getBoundingClientRect().top - top, behavior: 'instant' });
    try { localStorage.setItem(preferenceKey, language); } catch {}
  }

  const observer = new MutationObserver(records => {
    const changed = records.some(record => {
      if (record.type === 'characterData') {
        if (record.target.parentElement?.closest(excluded)) return false;
        return textRecords.get(record.target)?.rendered !== record.target.nodeValue;
      }
      if (record.type === 'attributes') {
        if (record.target.closest(excluded)) return false;
        return attributeRecords.get(record.target)?.get(record.attributeName)?.rendered !== record.target.getAttribute(record.attributeName);
      }
      return record.addedNodes.length > 0 && !record.target.closest?.(excluded);
    });
    if (!changed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; translateDocument(); });
  });

  control.addEventListener('click', event => {
    const button = event.target.closest('button[data-language]');
    if (button) setLanguage(button.dataset.language);
  });
  let preferred = sourceLanguage;
  try { const saved = localStorage.getItem(preferenceKey); if (languages.includes(saved)) preferred = saved; } catch {}
  setLanguage(preferred, false);
  control.hidden = false;
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
})();
