(() => {
  "use strict";
  const LANGUAGES = ["ja", "en"];
  const paramLang = (new URLSearchParams(window.location.search).get("lang") || "").toLowerCase();
  const stored = localStorage.getItem("rtype-language");
  let language = LANGUAGES.includes(paramLang)
    ? paramLang
    : LANGUAGES.includes(stored)
    ? stored
    : String(navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : "en";

  // 英訳辞書。日本語の原文はHTML側だけが持つ（data-i18n / data-i18n-html / data-i18n-* 属性で紐付け）。
  // data-i18n はtextContent、data-i18n-html はinnerHTMLを差し替える。
  const en = {
    "hero.languageLabel": "Display language",
    "hero.subtitle": "Combat Simulator",
    "hero.notesButton": "Analysis Notes",
    "app.disclaimer": "This is an unofficial tool based on reverse engineering. Results may differ from the actual game.",

    "common.unitSearch": "Search units",
    "common.rank": "Veterancy rank",
    "common.veterancySkill": "Veterancy stat",
    "common.fixedBadge": "Fixed",

    "unitPicker.title": "Select unit",
    "unitPicker.choose": "Choose",
    "unitPicker.search": "Search by unit name",
    "unitPicker.searchPlaceholder": "Enter a name",
    "unitPicker.filters": "Filters",
    "unitPicker.faction": "Faction",
    "unitPicker.category": "Category",
    "unitPicker.all": "All",
    "unitPicker.human": "Human",
    "unitPicker.bydo": "Bydo",
    "unitPicker.other": "Other",
    "unitPicker.ship": "Flagship eligible",
    "unitPicker.formation": "Unit",
    "unitPicker.force": "Force",
    "unitPicker.part": "Attached parts",
    "unitPicker.playability": "Availability",
    "unitPicker.playable": "Playable",
    "unitPicker.nonPlayable": "Non-playable",
    "unitPicker.single": "Single unit / object",
    "unitPicker.selectHint": "Selecting a candidate applies it immediately",
    "unitPicker.empty": "No units match these filters.",

    "attacker.title": "Attacker",
    "attacker.searchExample": "e.g. ARROW-HEAD",
    "attacker.unit": "Attacking unit",
    "attacker.weapon": "Weapon",
    "attacker.mode": "Attack mode",
    "attacker.modeNormal": "Normal attack",
    "attacker.modeCounter": "Counterattack",
    "attacker.formationCurrent": "Current units",
    "attacker.formationMax": "Max units",
    "attacker.formationHint": "The veterancy-improved stat and maximum formation are set by the selected unit. Only five-unit formations can change their current unit count.",
    "attacker.knockback": "Knockback destination is blocked",
    "attacker.partialCover": "Partial cover",
    "attacker.partialCoverHint": "Partial cover occurs when one of the two intermediate paths of a range-2 attack is blocked by terrain or an obstacle unit. Eligible weapons deal 50% damage.",

    "target.title": "Target",
    "target.swapLabel": "Swap sides",
    "target.swapTitle": "Swap attacker and target",
    "target.searchExample": "e.g. GAUPER",
    "target.unit": "Target unit",
    "target.type": "Unit type",
    "target.hexes": "Occupied hexes",
    "target.avoid": "Base evasion (%)",
    "target.fixedHint": "Unit type, occupied hexes, base evasion, and the veterancy-improved stat are fixed by the selected unit.",
    "target.evadeFocus": "Focus on evasion",
    "target.evadeFocusHint": "Focusing on evasion prevents counterattacks and interception, and grants an evasion bonus based on occupied hexes. It is mutually exclusive with interception.",

    "intercept.title": "Interception",
    "intercept.weapon": "Interception weapon",
    "intercept.attackerHp": "Attacker current HP (%)",
    "intercept.interceptorHp": "Interceptor current HP (%)",
    "intercept.reduction": "Damage reduction from interception",
    "intercept.relaxRange": "Relax interception range limit",
    "intercept.relaxRangeHint": "When enabled, interception weapon range limits are ignored to represent cases where unit shape allows interception.",
    "intercept.hint": "For interceptable attacks, only interception weapons whose ranges overlap the attack weapon are shown. Their shared range is listed, and the highest-base-power weapon is selected initially. Runtime availability such as ammunition, fuel, and line of fire is not included.",

    "terrain.title": "Terrain & combat conditions",
    "terrain.avoidBonus": "Terrain evasion bonus",
    "terrain.defense": "Terrain defense",
    "terrain.opt0": "0% (space, air, etc.)",
    "terrain.opt5": "5% (forest, weak storm, etc.)",
    "terrain.opt30": "30% (rock field, Pluto)",
    "terrain.avoidOpt10": "10% (debris, water surface, underwater, etc.)",
    "terrain.avoidOpt20": "20% (base, dock, etc.)",
    "terrain.avoidOpt50": "50% (waterfall, dense wreckage, etc.)",
    "terrain.defenseOpt10": "10% (debris, gas, thundercloud, etc.)",
    "terrain.defenseOpt20": "20% (base, water surface, sea surface, etc.)",
    "terrain.defenseOpt50": "50% (waterfall, underwater, etc.)",
    "terrain.hint": "The parentheses show representative terrain found in the extracted data. Maps may apply different modifiers to similarly named terrain.",

    "result.damageTitle": "Average damage on hit",
    "result.min": "Minimum",
    "result.max": "Maximum",
    "result.tackleRecoil": "Recoil to attacker",
    "result.avoidTitle": "Evasion (terrain block) rate",
    "result.showDetails": "Show formulas and breakdown",
    "result.damageFormulaTitle": "Damage formula",
    "result.avoidFormulaTitle": "Hit-rate formula",
    "result.targetMaxHp": "Target maximum HP (full)",
    "result.hpLossOnHit": "HP loss on hit",
    "result.minimumRngKill": "Hits to defeat at minimum damage (full HP)",
    "result.formationLoss": "Formation loss (from full HP)",
    "result.formationRule": "A five-unit formation loses one unit each time HP loss exceeds another 20% threshold.",

    "notes.title": "Damage System Analysis",
    "notes.close": "Close",
    "notes.toc": "Analysis notes contents",
    "notes.nav.flow": "01 Combat flow",
    "notes.nav.avoid": "02 Evasion & accuracy",
    "notes.nav.affinity": "03 Affinities",
    "notes.nav.terrain": "04 Terrain & cover",
    "notes.nav.intercept": "05 Interception",
    "notes.nav.seize": "06 Capture",
    "notes.nav.special": "07 Special attacks",

    "notes.flow.title": "Combat flow",
    "notes.flow.step1": "Attack setup",
    "notes.flow.step1Desc": "Determine weapon, normal/counter mode, range, and other conditions",
    "notes.flow.step2": "Interception",
    "notes.flow.step2Desc": "Calculate weapon-versus-weapon reduction for eligible attacks",
    "notes.flow.step3": "Terrain block",
    "notes.flow.step3Desc": "Make one random roll against effective evasion",
    "notes.flow.step4": "HP damage",
    "notes.flow.step4Desc": "Apply weapon power, formation, interception, damage RNG, terrain defense, and affinity",
    "notes.flow.step5": "Post-processing",
    "notes.flow.step5Desc": "Update knockback collision, formation count, and presentation values",
    "notes.flow.formula": "Damage ≈ Weapon power × Formation ratio × (1−Interception) × Damage RNG × (1−Effective terrain defense) × Affinity",
    "notes.flow.rng": "The damage modifier is uniformly distributed within each range shown below. It lowers normal-attack damage, while it raises counterattack damage.",
    "notes.flow.normalRng": "Normal attack RNG",
    "notes.flow.normalRngRange": "57.5–100%",
    "notes.flow.normalRngMean": "Mean 78.75%",
    "notes.flow.counterRng": "Counterattack RNG",
    "notes.flow.counterRngRange": "100–142.5%",
    "notes.flow.counterRngMean": "Mean 121.25%",

    "notes.avoid.title": "Evasion & accuracy",
    "notes.avoid.formula": "Effective evasion = Target evasion + [Focus: target evasion × 0.5 / occupied hexes] + Terrain evasion − Weapon accuracy",
    "notes.avoid.body": "After clamping to 0–100%, one 24-bit uniform random value is compared. Focusing on evasion adds <code>0.5 / occupied hexes</code> times base evasion. This bonus is not received while counterattacking or intercepting.",
    "notes.avoid.bypassTitle": "Guaranteed-hit bypass",
    "notes.avoid.bypassFormula": "Guaranteed-hit bypass enabled → 0% evasion / 100% hit rate",
    "notes.avoid.bypassBody": "Attacks with this setting bypass the normal calculation using target evasion, terrain evasion, and weapon accuracy. A displayed accuracy of 100% or the Particle attribute itself is not the direct condition.",
    "notes.avoid.bypassCharge": "All <b>131 included charge-weapon definitions have the guaranteed-hit bypass enabled</b>. Some non-charge special attacks are included as well.",
    "notes.avoid.bypassDisplay": "<b>Displayed accuracy below 100% can still be a guaranteed hit.</b> Ivy Rod displays 75%, but its guaranteed-hit bypass skips the evasion calculation in battle.",

    "notes.affinity.title": "Weapon attributes and unit affinities",
    "notes.affinity.intro": "Weapons have damage-affinity attributes and separate classifications for firing paths and conditions, such as direct, deflected, and homing. Optical, mechanical, biological, and similar attributes determine affinity damage.",
    "notes.affinity.targetGroup": "Target group",
    "notes.affinity.optical": "Optical",
    "notes.affinity.mechanical": "Mechanical",
    "notes.affinity.biological": "Biological",
    "notes.affinity.particle": "Particle",
    "notes.affinity.flame": "Flame",
    "notes.affinity.mental": "Mental",
    "notes.affinity.ice": "Ice",
    "notes.affinity.acid": "Acid",
    "notes.affinity.bioGroup": "Biological",
    "notes.affinity.rock": "Rock",
    "notes.affinity.other": "Other",
    "notes.affinity.otherNote": "“Other” is assigned to units such as GRID LOCK and AMBER PUPIL.",

    "notes.terrain.title": "Terrain evasion, terrain defense & partial cover",
    "notes.terrain.avoid": "<b>Terrain evasion</b> is added directly to the block rate used by the hit check.",
    "notes.terrain.defense": "<b>Terrain defense</b> reduces damage after a hit. In the verified HP formula it applies to optical attacks, while mechanical missiles and similar weapons bypass it.",
    "notes.terrain.walls": "<b>Mechanical and biological walls</b> are special cases for terrain evasion and optical terrain defense.",
    "notes.terrain.partialCover": "<b>Partial cover</b> occurs at maximum range 2 when only one intermediate path is blocked. It reduces non-mechanical damage to 50%.",

    "notes.intercept.title": "Interception is proportional weapon-vs-weapon reduction",
    "notes.intercept.intro": "The target's interception weapons are candidates against mechanical, biological, and ice attacks.",
    "notes.intercept.range": "Interception is allowed when the attack and interception weapon ranges overlap by at least one hex. A partial overlap is shown as the shared interceptable range.",
    "notes.intercept.rangeRelax": "Enabling 'Relax interception range limit' ignores only range overlap, representing cases where unit shape permits interception. Other conditions, including attack attributes and interception eligibility, still apply.",
    "notes.intercept.formula": "Raw interception = (Interceptor power / Attack power) × (Interceptor current HP / max HP) × (Attacker max HP / current HP) × Interceptor accuracy",
    "notes.intercept.low": "Below 10%",
    "notes.intercept.lowLabel": "Minimum interception",
    "notes.intercept.mid": "10% to below 90%",
    "notes.intercept.midValue": "Calculated value",
    "notes.intercept.midLabel": "Applied directly",
    "notes.intercept.high": "90% or higher",
    "notes.intercept.highLabel": "Full interception",
    "notes.intercept.order": "Capture rounds are a special case with 0% interception. Interception is processed before terrain defense.",
    "notes.intercept.tackleTitle": "Intercepting tackle attacks",
    "notes.intercept.tackleIntro": "When a tackle or Force Shoot is intercepted by an eligible interception weapon, the target takes reduced damage and the attacker takes recoil damage.",
    "notes.intercept.knockback": "Tackles, Force Shoot, and similar attacks cause knockback. If terrain or a unit blocks the destination, they gain additional base damage of <b>+25</b>.",
    "notes.intercept.recoilFormula": "Recoil = Attacker current HP × Interception rate × 0.85 (minimum 25, maximum 115)",
    "notes.intercept.ammo2": "All current interception weapons",
    "notes.intercept.ammo2Label": "All have defined ammo of 2 or more",
    "notes.intercept.ammo1": "Unused code branch",
    "notes.intercept.ammo1Label": "Defined ammo 1; no matching weapon",
    "notes.intercept.ammoNote": "This branch checks the weapon's defined initial/maximum ammo, not its remaining ammo in battle. Remaining ammo is tracked separately, so the factor does not change when one shot remains. All 99 extracted interception definitions have at least two shots, so the simulator fixes the factor at <b>0.85</b>.",
    "notes.intercept.recoilNote": "Recoil is clamped to 25–115. If it destroys the attacker, tackle damage to the target becomes zero. It does not occur without interception or when the weapon is not an eligible interception candidate.",

    "notes.seize.title": "Capture-round eligibility and success rate",
    "notes.seize.intro": "Capture rounds use a dedicated check separate from normal weapon accuracy and target evasion. Their 92% weapon-data accuracy is not the capture success rate.",
    "notes.seize.formula": "Capture eligibility = Remaining HP above 0% and at most 25%, OR remaining fuel from 0% through 40%",
    "notes.seize.normal": "Normal",
    "notes.seize.successRate": "Capture success rate",
    "notes.seize.evaded": "When evaded",
    "notes.seize.ineligible": "HP/fuel conditions not met",
    "notes.seize.ineligibleLabel": "Cannot capture",
    "notes.seize.hpCondition": "<b>HP condition</b> is met after removing at least 75% of maximum HP, leaving 25% or less. Exactly 25% is included; 0 HP is not.",
    "notes.seize.fuelCondition": "<b>Fuel condition</b> is met at 40% remaining fuel or less. Even at high HP, consuming at least 60% of fuel makes the unit eligible.",
    "notes.seize.noScaling": "<b>Lowering HP further does not increase the success rate.</b> At either 25% or 1% HP, the rates remain 60% normally and 15% when evaded.",
    "notes.seize.excluded": "<b>Excluded targets</b> include flagships, large units, and linked parent/child units. A failed attack also cannot capture.",
    "notes.seize.special": "<b>Capture rounds have 0% interception</b> as a special case. A captured unit joins your side only for the mission and is converted to resources afterward.",

    "notes.special.title": "Charge and special weapons",
    "notes.special.charge": "<b>Charge weapons such as Wave Cannons</b> have special branches for charging, area selection, and presentation, but their post-hit HP damage generally rejoins the standard path using the displayed attack power.",
    "notes.special.bypass": "For hit determination, every included charge weapon has the <b>guaranteed-hit bypass</b> applied and ignores target and terrain evasion.",
  };

  const originalText = new WeakMap();
  const originalHtml = new WeakMap();
  const originalAttrs = new WeakMap();
  const warned = new Set();
  const warnOnce = (message) => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`[i18n] ${message}`);
  };
  const lookup = (key) => {
    if (key in en) return en[key];
    warnOnce(`missing translation key: ${key}`);
    return null;
  };

  function translateStatic() {
    document.documentElement.lang = language;
    document.title = language === "ja" ? "R-TYPE TACTICS 戦闘シミュレータ" : "R-TYPE TACTICS Combat Simulator";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === "ja"
      ? "R-TYPE TACTICSの攻撃・迎撃・反撃ダメージと回避率を解析データに基づいて計算するシミュレータ。"
      : "A simulator for R-TYPE TACTICS attack, interception, counterattack damage, and evasion based on reverse-engineered data.";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      if (!originalText.has(element)) originalText.set(element, element.textContent);
      if (language === "ja") {
        element.textContent = originalText.get(element);
        return;
      }
      const translated = lookup(element.dataset.i18n);
      if (translated !== null) element.textContent = translated;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      if (!originalHtml.has(element)) originalHtml.set(element, element.innerHTML);
      if (language === "ja") {
        element.innerHTML = originalHtml.get(element);
        return;
      }
      const translated = lookup(element.dataset.i18nHtml);
      if (translated !== null) element.innerHTML = translated;
    });
    const attrTargets = [["data-i18n-placeholder", "placeholder"], ["data-i18n-title", "title"], ["data-i18n-aria-label", "aria-label"]];
    document.querySelectorAll("[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria-label]").forEach((element) => {
      if (!originalAttrs.has(element)) {
        originalAttrs.set(element, new Map(attrTargets
          .filter(([dataAttr]) => element.hasAttribute(dataAttr))
          .map(([, attr]) => [attr, element.getAttribute(attr)])));
      }
      for (const [dataAttr, attr] of attrTargets) {
        const key = element.getAttribute(dataAttr);
        if (!key) continue;
        if (language === "ja") {
          element.setAttribute(attr, originalAttrs.get(element).get(attr));
          continue;
        }
        const translated = lookup(key);
        if (translated !== null) element.setAttribute(attr, translated);
      }
    });
    if (language === "en") scheduleUntranslatedCheck();
  }

  // 訳漏れ検知: 英語表示なのに日本語（かな・漢字）が画面に残っていたらconsoleに警告する。
  // app.jsの再描画（requestAnimationFrame経由）より後に走らせるため、rAF+setTimeoutで遅延する。
  const JAPANESE_PATTERN = /[ぁ-ヿ㐀-䶿一-鿿]/;
  let checkPending = false;
  function scheduleUntranslatedCheck() {
    if (checkPending) return;
    checkPending = true;
    requestAnimationFrame(() => setTimeout(() => {
      checkPending = false;
      if (language !== "en") return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!JAPANESE_PATTERN.test(node.nodeValue)) continue;
        if (node.parentElement?.closest("script,style,[data-i18n-ignore]")) continue;
        warnOnce(`untranslated Japanese text: "${node.nodeValue.trim()}"`);
      }
    }, 0));
  }

  window.RTYPE_I18N = {
    get language() { return language; },
    pick(ja, en) { return language === "ja" ? ja : en; },
    name(value) { return language === "ja" ? value?.nameJa || value?.name : value?.nameEn || value?.nameJa || value?.name; },
    translateStatic,
    setLanguage(next) {
      if (!LANGUAGES.includes(next)) return;
      language = next;
      localStorage.setItem("rtype-language", next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
      translateStatic();
    },
  };
  translateStatic();
})();
