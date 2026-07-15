(() => {
  "use strict";
  const stored = localStorage.getItem("rtype-language");
  let language = ["ja", "en"].includes(stored)
    ? stored
    : String(navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : "en";

  const pairs = [
    ["表示言語", "Display language"], ["閉じる", "Close"], ["解析知見の目次", "Analysis notes contents"],
    ["例：アロー・ヘッド", "e.g. ARROW-HEAD"], ["例：ガウパー", "e.g. GAUPER"],
    ["戦闘シミュレータ", "Combat Simulator"], ["解析知見", "Analysis Notes"],
    ["※ 本シミュレータは解析に基づく非公式ツールです。計算結果は実際のゲームと異なる(間違っている)可能性があります。", "This is an unofficial tool based on reverse engineering. Results may differ from the actual game."],
    ["攻撃側", "Attacker"], ["対象", "Target"], ["ユニット検索", "Search units"], ["攻撃ユニット", "Attacking unit"], ["被害ユニット", "Target unit"], ["使用武器", "Weapon"],
    ["熟練ランク", "Veterancy rank"], ["熟練で向上", "Veterancy bonus"], ["固定", "Fixed"], ["攻撃種別", "Attack mode"], ["通常攻撃", "Normal attack"], ["反撃", "Counterattack"],
    ["現在編隊数", "Current formation"], ["最大編隊数", "Maximum formation"],
    ["熟練で向上する能力と最大編隊数は、選択したユニットに合わせて自動設定されます。5機編隊のみ現在編隊数を変更できます。", "The veterancy bonus and maximum formation are set by the selected unit. Only five-unit formations can change their current unit count."],
    ["ノックバック先が塞がっている", "Knockback destination is blocked"], ["部分遮蔽", "Partial cover"], ["射程2・非機械のみ", "Range 2, non-mechanical only"],
    ["部分遮蔽は、距離2の攻撃で2つある中間経路の片方だけが地形・障害物ユニットに遮られた状態です。対象武器ではダメージが50%になります。", "Partial cover occurs when one of the two intermediate paths of a range-2 attack is blocked by terrain or an obstacle unit. Eligible weapons deal 50% damage."],
    ["ユニット種別", "Unit type"], ["占有HEX数", "Occupied hexes"], ["基礎回避率（%）", "Base evasion (%)"],
    ["ユニット種別、占有HEX数、基礎回避率、熟練で向上する能力は、選択したユニットに固定されており変更できません。", "Unit type, occupied hexes, base evasion, and veterancy bonus are fixed by the selected unit."],
    ["回避に専念", "Focus on evasion"], ["基礎回避 × 0.5 ÷ 占有HEXを加算", "Add base evasion × 0.5 ÷ occupied hexes"],
    ["回避に専念すると反撃・迎撃は行わず、占有HEX数に応じた回避ボーナスを受けます。迎撃武器とは排他選択です。", "Focusing on evasion prevents counterattacks and interception, and grants an evasion bonus based on occupied hexes. It is mutually exclusive with interception."],
    ["迎撃システム", "Interception"], ["迎撃対象外", "Not interceptable"], ["迎撃武器", "Interception weapon"], ["迎撃なし", "No interception"],
    ["攻撃側 現在HP率（%）", "Attacker current HP (%)"], ["迎撃側 現在HP率（%）", "Interceptor current HP (%)"], ["迎撃による被ダメ減衰", "Damage reduction from interception"], ["迎撃武器を選択してください", "Select an interception weapon"],
    ["迎撃可能な属性の攻撃に対して、攻撃武器と射程が重なる迎撃武器だけを表示します。候補には迎撃可能な共通射程も表示し、初期状態では基礎威力が最も高い武器を選びます。残弾・燃料・射線などの実行時使用可否は含みません。", "For interceptable attacks, only interception weapons whose ranges overlap the attack weapon are shown. Their shared range is listed, and the highest-base-power weapon is selected initially. Runtime availability such as ammunition, fuel, and line of fire is not included."],
    ["地形・戦闘条件", "Terrain & combat conditions"], ["地形の固定回避加算", "Terrain evasion bonus"], ["地形防御率", "Terrain defense"],
    ["0%（空間・空気など）", "0% (space, air, etc.)"], ["5%（森・弱い暴風など）", "5% (forest, weak storm, etc.)"], ["10%（デブリ帯・水面・水中など）", "10% (debris, water surface, underwater, etc.)"], ["20%（基地・ドックなど）", "20% (base, dock, etc.)"], ["30%（岩群・冥王星）", "30% (rock field, Pluto)"], ["50%（滝・残骸密集地帯など）", "50% (waterfall, dense wreckage, etc.)"],
    ["10%（デブリ帯・ガス・雷雲など）", "10% (debris, gas, thundercloud, etc.)"], ["20%（基地・水面・海面など）", "20% (base, water surface, sea surface, etc.)"], ["50%（滝・水中など）", "50% (waterfall, underwater, etc.)"],
    ["括弧内は抽出データで確認できた代表的な地形例です。同名系統でもマップ固有データにより補正が異なる場合があります。", "The parentheses show representative terrain found in the extracted data. Maps may apply different modifiers to similarly named terrain."],
    ["命中時ダメージ", "Damage on hit"], ["HP 0.0%減", "0.0% HP lost"], ["最小", "Minimum"], ["最大", "Maximum"], ["攻撃側への反動", "Recoil to attacker"], ["攻撃側HP 0.0%減", "Attacker loses 0.0% HP"], ["体当たり迎撃の反動式", "Intercepted tackle recoil formula"],
    ["機械 vs 光学", "Mechanical vs Optical"], ["地形減衰", "Terrain reduction"], ["迎撃減衰", "Interception reduction"], ["回避（地形ブロック）率", "Evasion (terrain block) rate"], ["命中率 100.0%", "Hit rate 100.0%"],
    ["計算式・内訳を表示", "Show formulas and breakdown"], ["攻撃力の式", "Damage formula"], ["命中率の式", "Hit-rate formula"], ["対象最大HP（満タン）", "Target maximum HP (full)"], ["命中時HP損耗", "HP loss on hit"], ["回避込みHP損耗", "Expected HP loss"], ["編隊損耗（満タン時）", "Formation loss (from full HP)"], ["0機", "0 units"], ["迎撃後通過率", "Post-interception pass rate"],
    ["5機編隊はHP損耗が20%を超えるごとに1機減少します。", "A five-unit formation loses one unit each time HP loss exceeds another 20% threshold."],
    ["ダメージシステムの解析知見", "Damage System Analysis"], ["01 戦闘フロー", "01 Combat flow"], ["02 回避・命中", "02 Evasion & accuracy"], ["03 属性相性", "03 Affinities"], ["04 地形・遮蔽", "04 Terrain & cover"], ["05 迎撃", "05 Interception"], ["06 鹵獲", "06 Capture"], ["07 特殊攻撃", "07 Special attacks"],
    ["戦闘フロー", "Combat flow"], ["攻撃成立", "Attack setup"], ["攻撃武器・通常/反撃・射程などを決定", "Determine weapon, normal/counter mode, range, and other conditions"], ["迎撃", "Interception"], ["対象攻撃だけ武器対武器の減衰率を算出", "Calculate weapon-versus-weapon reduction for eligible attacks"], ["地形ブロック", "Terrain block"], ["実効回避率に対する乱数1回で命中判定", "Make one random roll against effective evasion"], ["HPダメージ", "HP damage"], ["武器威力、編隊、迎撃、威力乱数、地形防御、属性相性を適用", "Apply weapon power, formation, interception, damage RNG, terrain defense, and affinity"], ["追加処理", "Post-processing"], ["ノックバック衝突、編隊機数、演出用の表示値を更新", "Update knockback collision, formation count, and presentation values"],
    ["ダメージ ≈ 武器威力 × 編隊率 × (1−迎撃率) × 威力乱数 × (1−実効地形防御) × 属性相性", "Damage ≈ Weapon power × Formation ratio × (1−Interception) × Damage RNG × (1−Effective terrain defense) × Affinity"], ["乱数要素として、通常攻撃ではダメージが下振れ、一方反撃ではダメージが上振れるように乗ります。", "The random modifier lowers normal-attack damage, while it raises counterattack damage."], ["通常攻撃RNG", "Normal attack RNG"], ["平均78.75%", "Mean 78.75%"], ["反撃RNG", "Counterattack RNG"], ["平均121.25%", "Mean 121.25%"],
    ["回避・命中", "Evasion & accuracy"], ["実効回避 = 対象回避 + [回避専念時: 対象回避 × 0.5 / 占有HEX数] + 地形回避 − 武器命中", "Effective evasion = Target evasion + [Focus: target evasion × 0.5 / occupied hexes] + Terrain evasion − Weapon accuracy"], ["0～100%に制限後、24bit一様乱数を1回比較します。回避に専念すると、基礎回避率の", "After clamping to 0–100%, one 24-bit uniform random value is compared. Focusing on evasion adds"], ["0.5 / 占有HEX数", "0.5 / occupied hexes"], ["倍を加算します。反撃・迎撃時はこのボーナスを受けません。", "times base evasion. This bonus is not received while counterattacking or intercepting."],
    ["必中", "Guaranteed hit"], ["必中バイパス", "Guaranteed-hit bypass"], ["必中バイパス設定あり → 回避率 0% / 命中率 100%", "Guaranteed-hit bypass enabled → 0% evasion / 100% hit rate"], ["この設定を持つ攻撃は、対象回避・地形回避・武器命中による通常の回避計算を通りません。表示命中値100%や粒子属性そのものが直接の条件ではありません。", "Attacks with this setting bypass the normal calculation using target evasion, terrain evasion, and weapon accuracy. A displayed accuracy of 100% or the Particle attribute itself is not the direct condition."],
    ["収録中の", "All "], ["チャージ武器131定義はすべて必中バイパス設定済み", "131 included charge-weapon definitions have the guaranteed-hit bypass enabled"], ["です。チャージ武器以外の一部の特殊攻撃も含まれます。", ". Some non-charge special attacks are included as well."], ["表示命中値が100%未満でも必中です。", "Displayed accuracy below 100% can still be a guaranteed hit. "], ["アイビーロッドは表示75%ですが、必中バイパス対象のため実戦では回避計算を通りません。", "Ivy Rod displays 75%, but its guaranteed-hit bypass skips the evasion calculation in battle."],
    ["武器属性とユニット相性", "Weapon attributes and unit affinities"], ["武器には、ダメージ相性を決める属性と、直行・偏光・追尾など射線や使用条件を決める分類があります。相性ダメージに使われるのは光学・機械・生体などの属性です。", "Weapons have damage-affinity attributes and separate classifications for firing paths and conditions, such as direct, deflected, and homing. Optical, mechanical, biological, and similar attributes determine affinity damage."],
    ["対象系統", "Target group"], ["光学", "Optical"], ["機械", "Mechanical"], ["生体", "Biological"], ["粒子", "Particle"], ["火炎", "Flame"], ["精神", "Mental"], ["氷", "Ice"], ["酸", "Acid"], ["生物", "Biological"], ["岩石", "Rock"], ["異質", "Other"], ["\"異質\"はグリッドロックや琥珀色の瞳孔などに振られています。", "“Other” is assigned to units such as GRID LOCK and AMBER PUPIL."],
    ["地形回避・地形防御・部分遮蔽", "Terrain evasion, terrain defense & partial cover"], ["地形回避", "Terrain evasion"], ["は命中判定のブロック率に固定加算されます。", "is added directly to the block rate used by the hit check."], ["地形防御", "Terrain defense"], ["は命中後のダメージ減衰です。現在確認できた実HP式では光学属性に適用され、機械属性ミサイルなどはバイパスします。", "reduces damage after a hit. In the verified HP formula it applies to optical attacks, while mechanical missiles and similar weapons bypass it."], ["機械壁・生体壁", "Mechanical and biological walls"], ["は地形回避と光学地形防御の特例対象です。", "are special cases for terrain evasion and optical terrain defense."], ["は最大射程2で中間経路の片方だけが塞がる状態。機械属性以外のダメージを50%にします。", "occurs at maximum range 2 when only one intermediate path is blocked. It reduces non-mechanical damage to 50%."],
    ["迎撃は武器対武器の比例減衰", "Interception is proportional weapon-vs-weapon reduction"], ["機械・生体・氷属性の攻撃に対して、対象が持つ迎撃武器が候補になります。", "The target's interception weapons are candidates against mechanical, biological, and ice attacks."], ["攻撃距離を個別に選ぶのではなく、攻撃武器と迎撃武器の射程が1HEXでも重なれば、その共通射程で迎撃可能として計算します。射程が一部だけ重なる場合は、候補欄に迎撃可能な距離を表示します。", "Interception is allowed when the attack and interception weapon ranges overlap by at least one hex. A partial overlap is shown as the shared interceptable range."], ["未補正迎撃率 = (迎撃武器威力 / 攻撃武器威力) × (迎撃側現在HP / 最大HP) × (攻撃側最大HP / 現在HP) × 迎撃武器命中", "Raw interception = (Interceptor power / Attack power) × (Interceptor current HP / max HP) × (Attacker max HP / current HP) × Interceptor accuracy"],
    ["10%未満", "Below 10%"], ["最低迎撃率", "Minimum interception"], ["10～90%未満", "10% to below 90%"], ["計算値", "Calculated value"], ["そのまま減衰", "Applied directly"], ["90%以上", "90% or higher"], ["完全迎撃", "Full interception"], ["鹵獲弾は例外的に迎撃率0%です。迎撃は地形防御より前に処理されます。", "Capture rounds are a special case with 0% interception. Interception is processed before terrain defense."],
    ["体当たりに対する迎撃", "Intercepting tackle attacks"], ["体当たり・フォースシュートと射程が重なる迎撃武器で迎撃されると、対象側ダメージの減衰に加えて攻撃側に反動ダメージが入ります。", "When a tackle or Force Shoot is intercepted by a weapon with overlapping range, the target takes reduced damage and the attacker takes recoil damage."], ["体当たり・フォースシュートなどはノックバックを発生させます。移動先が地形またはユニットで塞がると追加基礎ダメージ", "Tackles, Force Shoot, and similar attacks cause knockback. If terrain or a unit blocks the destination, they gain additional base damage of"], ["です。", "."], ["反動 = 攻撃側現在HP × 迎撃率 × 0.85（最低25・最大115）", "Recoil = Attacker current HP × Interception rate × 0.85 (minimum 25, maximum 115)"],
    ["現行の全迎撃武器", "All current interception weapons"], ["定義弾数はすべて2以上", "All have defined ammo of 2 or more"], ["コード上の未使用分岐", "Unused code branch"], ["定義弾数1・該当武器なし", "Defined ammo 1; no matching weapon"], ["0.85固定", "0.85"],
    ["この分岐が見るのはゲーム中の残弾数ではなく、武器定義上の初期・最大弾数です。現在残弾は別に管理されるため、残り1発になっても係数は変わりません。抽出した迎撃武器99定義はすべて定義弾数2以上であるため、シミュレーターでは係数を", "This branch checks the weapon's defined initial/maximum ammo, not its remaining ammo in battle. Remaining ammo is tracked separately, so the factor does not change when one shot remains. All 99 extracted interception definitions have at least two shots, so the simulator fixes the factor at"], ["としています。", "."],
    ["反動は最低25、最大115。この反動で攻撃側が撃破される場合、対象側への体当たりダメージは0になります。迎撃しない場合や、迎撃武器の射程外では発生しません。", "Recoil is clamped to 25–115. If it destroys the attacker, tackle damage to the target becomes zero. It does not occur without interception or outside the interceptor's range."],
    ["鹵獲弾の対象条件と成功率", "Capture-round eligibility and success rate"], ["鹵獲弾は通常の武器命中・対象回避計算とは別の専用判定を使います。武器データ上の命中値92%は鹵獲成功率ではありません。", "Capture rounds use a dedicated check separate from normal weapon accuracy and target evasion. Their 92% weapon-data accuracy is not the capture success rate."], ["鹵獲可能条件 = 残HPが0%超～25%以下 または 残燃料が0～40%以下", "Capture eligibility = Remaining HP above 0% and at most 25%, OR remaining fuel from 0% through 40%"],
    ["通常時", "Normal"], ["鹵獲成功率", "Capture success rate"], ["回避扱い", "Evasion case"], ["HP・燃料条件外", "HP/fuel conditions not met"], ["鹵獲不可", "Cannot capture"], ["HP条件", "HP condition"], ["燃料条件", "Fuel condition"], ["HPをさらに減らしても成功率は上がりません。", "Lowering HP further does not increase the success rate."], ["残HP25%でも1%でも、通常60%・回避扱い15%です。", "At either 25% or 1% HP, the rates remain 60% normally and 15% in the evasion case."], ["対象外", "Excluded targets"], ["鹵獲弾は迎撃率0%", "Capture rounds have 0% interception"],
    ["は最大HPの75%以上を削り、残HPを25%以下にすると成立します。25%ちょうどを含み、HP 0は含みません。", "is met after removing at least 75% of maximum HP, leaving 25% or less. Exactly 25% is included; 0 HP is not."], ["は残燃料40%以下で成立します。HPが高くても、燃料を60%以上消費させれば候補になります。", "is met at 40% remaining fuel or less. Even at high HP, consuming at least 60% of fuel makes the unit eligible."], ["は旗艦、大型、親子・接続中のユニットなどです。攻撃失敗扱いの場合も鹵獲できません。", "include flagships, large units, and linked parent/child units. A failed attack also cannot capture."], ["の特例で、成功後はミッション中だけ自軍ユニットになり、終了後に資源へ解体されます。", "as a special case. A captured unit joins your side only for the mission and is converted to resources afterward."],
    ["チャージ・特殊武器", "Charge and special weapons"], ["波動砲などのチャージ武器", "Charge weapons such as Wave Cannons"], ["は、チャージ・範囲選択・専用演出に特殊分岐がありますが、命中後のHPダメージは基本的に表記APから同じ系統へ合流します。", "have special branches for charging, area selection, and presentation, but their post-hit HP damage generally rejoins the standard path using the displayed attack power."], ["命中判定では、収録中のチャージ武器はすべて上記の", "For hit determination, every included charge weapon has the "], ["が適用され、対象や地形の回避率を無視します。", " applied and ignores target and terrain evasion."]
  ];
  const english = new Map(pairs);
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  const normalize = (text) => text.replace(/\s+/g, " ").trim();

  function translateStatic(root = document.body) {
    document.documentElement.lang = language;
    document.title = language === "ja" ? "R-TYPE TACTICS 戦闘シミュレータ" : "R-TYPE TACTICS Combat Simulator";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === "ja"
      ? "R-TYPE TACTICSの攻撃・迎撃・反撃ダメージと回避率を解析データに基づいて計算するシミュレータ。"
      : "A simulator for R-TYPE TACTICS attack, interception, counterattack damage, and evasion based on reverse-engineered data.";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("script,style")) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const original = originalText.get(node);
      const key = normalize(original);
      node.nodeValue = language === "en" && english.has(key) ? original.replace(key, english.get(key)) : original;
    }
    root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((element) => {
      if (!originalAttrs.has(element)) originalAttrs.set(element, Object.fromEntries(["placeholder", "title", "aria-label"].filter((key) => element.hasAttribute(key)).map((key) => [key, element.getAttribute(key)])));
      for (const [key, original] of Object.entries(originalAttrs.get(element))) {
        element.setAttribute(key, language === "en" ? english.get(normalize(original)) || original : original);
      }
    });
  }

  window.RTYPE_I18N = {
    get language() { return language; },
    pick(ja, en) { return language === "ja" ? ja : en; },
    name(value) { return language === "ja" ? value?.nameJa || value?.name : value?.nameEn || value?.nameJa || value?.name; },
    translateStatic,
    setLanguage(next) {
      if (!["ja", "en"].includes(next)) return;
      language = next;
      localStorage.setItem("rtype-language", next);
      translateStatic();
    },
  };
  translateStatic();
})();
