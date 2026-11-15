import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {Array<[string,string,string,string,string,string,string,string[],number,string,string[],string]>} */
const words = [
  ['resilient', '/rɪˈzɪl.i.ənt/', 'sıfat', 'dirençli', 'Able to recover quickly from difficulties.', 'She stayed resilient after the setback.', 'Aksiliğe rağmen dirençli kaldı.', ['dirençli', 'kırılgan', 'tembel'], 0, 'B2', ['adaptable', 'tough'], 'strong storm comeback'],
  ['ambiguous', '/æmˈbɪɡ.ju.əs/', 'sıfat', 'muğlak', 'Open to more than one interpretation.', 'The ending of the film was ambiguous.', 'Filmin sonu muğlaktı.', ['net', 'muğlak', 'kısa'], 1, 'B2/C1', ['vague', 'unclear'], 'confusing illusion mystery'],
  ['meticulous', '/məˈtɪk.jə.ləs/', 'sıfat', 'titiz', 'Showing great attention to detail.', 'He kept meticulous notes during the experiment.', 'Deney sırasında titiz notlar tuttu.', ['titiz', 'dikkatsiz', 'aceleci'], 0, 'C1', ['thorough', 'precise'], 'magnifying glass inspect'],
  ['inevitable', '/ɪˈnev.ɪ.tə.bəl/', 'sıfat', 'kaçınılmaz', 'Certain to happen; unavoidable.', 'Change is inevitable in growing cities.', 'Büyüyen şehirlerde değişim kaçınılmazdır.', ['tesadüfi', 'kaçınılmaz', 'nadir'], 1, 'B2', ['unavoidable', 'certain'], 'falling dominoes chain'],
  ['profound', '/prəˈfaʊnd/', 'sıfat', 'derin', 'Very great or intense; deep.', 'The discovery had a profound impact on medicine.', 'Keşif tıpta derin bir etki yarattı.', ['yüzeysel', 'derin', 'geçici'], 1, 'C1', ['deep', 'meaningful'], 'deep ocean light'],
  ['scarce', '/skeəs/', 'sıfat', 'kıt', 'Insufficient for the demand; rare.', 'Clean water is scarce in the region.', 'Bölgede temiz su kıttır.', ['bol', 'ucuz', 'kıt'], 2, 'B2', ['rare', 'limited'], 'dry desert cracked'],
  ['compelling', '/kəmˈpel.ɪŋ/', 'sıfat', 'ikna edici', 'Evoking interest or attention in a powerful way.', 'She made a compelling argument.', 'İkna edici bir argüman sundu.', ['ikna edici', 'sıkıcı', 'belirsiz'], 0, 'B2/C1', ['persuasive', 'engaging'], 'captivated audience listening'],
  ['fragile', '/ˈfrædʒ.aɪl/', 'sıfat', 'kırılgan', 'Easily broken or damaged.', 'The ecosystem is fragile and needs protection.', 'Ekosistem kırılgan ve korunmaya muhtaç.', ['dayanıklı', 'kırılgan', 'ağır'], 1, 'B1', ['delicate', 'brittle'], 'thin glass crack'],
  ['plausible', '/ˈplɔː.zə.bəl/', 'sıfat', 'makul', 'Seeming reasonable or probable.', 'His explanation sounded plausible.', 'Açıklaması makul geldi.', ['imkânsız', 'makul', 'saçma'], 1, 'C1', ['believable', 'credible'], 'nodding thinking idea'],
  ['subtle', '/ˈsʌt.əl/', 'sıfat', 'ince', 'Delicate or precise; not obvious.', 'There was a subtle change in the tone.', 'Tonda ince bir değişiklik vardı.', ['kaba', 'ince', 'yüksek'], 1, 'B2/C1', ['delicate', 'faint'], 'soft watercolor blend'],
  ['advocate', '/ˈæd.və.keɪt/', 'fiil', 'savunmak', 'To publicly support or recommend.', 'Scientists advocate for cleaner energy.', 'Bilim insanları temiz enerjiyi savunuyor.', ['reddetmek', 'savunmak', 'gizlemek'], 1, 'B2/C1', ['support', 'champion'], 'public speaker megaphone'],
  ['undermine', '/ˌʌn.dəˈmaɪn/', 'fiil', 'zayıflatmak', 'To weaken or damage gradually.', 'False rumors can undermine trust.', 'Yanlış söylentiler güveni zayıflatabilir.', ['güçlendirmek', 'zayıflatmak', 'ölçmek'], 1, 'B2/C1', ['weaken', 'sabotage'], 'crumbling sand foundation'],
  ['flourish', '/ˈflʌr.ɪʃ/', 'fiil', 'gelişmek', 'To grow or develop successfully.', 'Local markets flourish in spring.', 'Yerel pazarlar baharda gelişir.', ['gerilemek', 'gelişmek', 'donmak'], 1, 'B2/C1', ['thrive', 'bloom'], 'flower blooming fast'],
  ['prevail', '/prɪˈveɪl/', 'fiil', 'hâkim olmak', 'To prove more powerful or widespread.', 'Hope can prevail even in hard times.', 'Zor zamanlarda bile umut hâkim olabilir.', ['yenilmek', 'hâkim olmak', 'kaybolmak'], 1, 'C1', ['triumph', 'endure'], 'mountain summit victory'],
  ['perceive', '/pəˈsiːv/', 'fiil', 'algılamak', 'To become aware of through the senses.', 'We perceive color through reflected light.', 'Rengi yansıyan ışık yoluyla algılarız.', ['algılamak', 'unutmak', 'yok saymak'], 0, 'B2', ['notice', 'sense'], 'human eye light'],
  ['sustain', '/səˈsteɪn/', 'fiil', 'sürdürmek', 'To keep something going over time.', 'Farms need rain to sustain crops.', 'Çiftliklerin ürünü sürdürmek için yağmura ihtiyacı vardır.', ['sürdürmek', 'kesmek', 'ertelemek'], 0, 'B2', ['maintain', 'uphold'], 'green plant watering'],
  ['emerge', '/ɪˈmɜːdʒ/', 'fiil', 'ortaya çıkmak', 'To come into view or become known.', 'New evidence began to emerge.', 'Yeni kanıtlar ortaya çıkmaya başladı.', ['gizlenmek', 'ortaya çıkmak', 'erimek'], 1, 'B2', ['appear', 'surface'], 'whale rising ocean'],
  ['enhance', '/ɪnˈhɑːns/', 'fiil', 'geliştirmek', 'To improve the quality or value of something.', 'Sleep can enhance memory.', 'Uyku hafızayı geliştirebilir.', ['bozmak', 'geliştirmek', 'ertelemek'], 1, 'B2', ['improve', 'boost'], 'camera lens focus'],
  ['inhibit', '/ɪnˈhɪb.ɪt/', 'fiil', 'engellemek', 'To hinder or restrain an action.', 'Fear can inhibit creativity.', 'Korku yaratıcılığı engelleyebilir.', ['teşvik etmek', 'engellemek', 'ölçmek'], 1, 'C1', ['restrain', 'hinder'], 'red traffic barrier'],
  ['infer', '/ɪnˈfɜːr/', 'fiil', 'çıkarım yapmak', 'To reach a conclusion from evidence.', 'From the clues we can infer the cause.', 'İpuçlarından nedeni çıkarım yapabiliriz.', ['tahmin etmek', 'çıkarım yapmak', 'ezberlemek'], 1, 'B2/C1', ['deduce', 'conclude'], 'detective clues notebook'],
  ['breakthrough', '/ˈbreɪk.θruː/', 'isim', 'atılım', 'A sudden important discovery or advance.', 'The vaccine was a major breakthrough.', 'Aşı büyük bir atılımdı.', ['gerileme', 'atılım', 'alışkanlık'], 1, 'B2', ['discovery', 'advance'], 'glowing lightbulb spark'],
  ['hypothesis', '/haɪˈpɒθ.ə.sɪs/', 'isim', 'hipotez', 'A proposed explanation to be tested.', 'They tested the hypothesis in the lab.', 'Hipotezi laboratuvarda test ettiler.', ['kanıt', 'hipotez', 'sonuç'], 1, 'B2/C1', ['theory', 'proposal'], 'scientist chalkboard formula'],
  ['phenomenon', '/fəˈnɒm.ɪ.nən/', 'isim', 'olgu', 'A fact or event that can be observed.', 'Auroras are a natural phenomenon.', 'Kutup ışıkları doğal bir olgudur.', ['kuram', 'olgu', 'varsayım'], 1, 'B2/C1', ['occurrence', 'marvel'], 'northern lights aurora'],
  ['consequence', '/ˈkɒn.sɪ.kwəns/', 'isim', 'sonuç', 'A result or effect of an action.', 'Pollution has serious consequences.', 'Kirliliğin ciddi sonuçları vardır.', ['neden', 'sonuç', 'araç'], 1, 'B2', ['outcome', 'effect'], 'ripple effect water'],
  ['insight', '/ˈɪn.saɪt/', 'isim', 'içgörü', 'A clear understanding of a complex issue.', 'The study offered new insight into sleep.', 'Çalışma uykuya dair yeni bir içgörü sundu.', ['kafa karışıklığı', 'içgörü', 'şüphe'], 1, 'B2/C1', ['understanding', 'clarity'], 'brain glowing idea'],
  ['threshold', '/ˈθreʃ.həʊld/', 'isim', 'eşik', 'The level at which something begins.', 'Pain rises above a certain threshold.', 'Ağrı belirli bir eşiğin üzerinde artar.', ['tavan', 'eşik', 'merkez'], 1, 'C1', ['limit', 'doorway'], 'opening bright doorway'],
  ['paradigm', '/ˈpær.ə.daɪm/', 'isim', 'paradigma', 'A typical example or model of something.', 'The discovery shifted the scientific paradigm.', 'Keşif bilimsel paradigmayı değiştirdi.', ['ayrıntı', 'paradigma', 'tesadüf'], 1, 'C1', ['model', 'archetype'], 'orbiting galaxy planets'],
  ['incentive', '/ɪnˈsen.tɪv/', 'isim', 'teşvik', 'Something that motivates action.', 'Tax cuts can be an incentive to invest.', 'Vergi indirimleri yatırım için bir teşvik olabilir.', ['engel', 'teşvik', 'ceza'], 1, 'B2', ['motivation', 'reward'], 'golden trophy prize'],
  ['obstacle', '/ˈɒb.stə.kəl/', 'isim', 'engel', 'Something that blocks progress.', 'Lack of funding is a major obstacle.', 'Fon eksikliği büyük bir engeldir.', ['fırsat', 'engel', 'ödül'], 1, 'B1', ['barrier', 'hurdle'], 'runner jumping hurdle'],
  ['momentum', '/məˈmen.təm/', 'isim', 'ivme', 'The force that keeps something moving.', 'The campaign gained momentum quickly.', 'Kampanya hızla ivme kazandı.', ['durgunluk', 'ivme', 'gecikme'], 1, 'B2/C1', ['drive', 'impetus'], 'spinning gyroscope motion'],
  ['counterpart', '/ˈkaʊn.tə.pɑːt/', 'isim', 'muadil', 'A person or thing that corresponds to another.', 'She met her counterpart from Japan.', "Japonya'daki muadiliyle buluştu.", ['rakip', 'muadil', 'öğrenci'], 1, 'C1', ['equivalent', 'peer'], 'mirror reflection symmetry'],
  ['framework', '/ˈfreɪm.wɜːk/', 'isim', 'çerçeve', 'A basic structure supporting ideas or systems.', 'The law provides a clear framework.', 'Yasa net bir çerçeve sunar.', ['karmaşa', 'çerçeve', 'ayrıntı'], 1, 'B2', ['structure', 'blueprint'], 'architect building blueprint'],
  ['coexistence', '/ˌkəʊ.ɪɡˈzɪs.təns/', 'isim', 'birlikte var olma', 'Living or existing together at the same time.', 'Peaceful coexistence is possible.', 'Barışçıl birlikte var olma mümkündür.', ['çatışma', 'birlikte var olma', 'izolasyon'], 1, 'C1', ['harmony', 'symbiosis'], 'birds forest harmony'],
  ['diversity', '/daɪˈvɜː.sə.ti/', 'isim', 'çeşitlilik', 'The state of being varied.', 'Biodiversity supports healthy ecosystems.', 'Biyoçeşitlilik sağlıklı ekosistemleri destekler.', ['tekdüzelik', 'çeşitlilik', 'kıtlık'], 1, 'B2', ['variety', 'range'], 'colorful coral reef'],
  ['integrity', '/ɪnˈteɡ.rə.ti/', 'isim', 'dürüstlük', 'The quality of being honest and having strong principles.', 'She is respected for her integrity.', 'Dürüstlüğü sayesinde saygı görür.', ['sahtekârlık', 'dürüstlük', 'korku'], 1, 'B2/C1', ['honesty', 'honor'], 'balanced golden scales'],
  ['reluctant', '/rɪˈlʌk.tənt/', 'sıfat', 'isteksiz', 'Unwilling and hesitant.', 'He was reluctant to share the news.', 'Haberi paylaşmaya isteksizdi.', ['hevesli', 'isteksiz', 'aceleci'], 1, 'B2', ['hesitant', 'unwilling'], 'person hesitating doorway'],
  ['abundant', '/əˈbʌn.dənt/', 'sıfat', 'bol', 'Existing in large quantities.', 'The forest has abundant wildlife.', 'Ormanda bol yaban hayatı vardır.', ['kıt', 'bol', 'nadir'], 1, 'B2/C1', ['plentiful', 'rich'], 'lush waterfall forest'],
  ['crucial', '/ˈkruː.ʃəl/', 'sıfat', 'hayati', 'Extremely important or decisive.', 'Timing is crucial for the launch.', 'Fırlatma için zamanlama hayati önemdedir.', ['önemsiz', 'hayati', 'rastgele'], 1, 'B2', ['vital', 'essential'], 'clockwork gear mechanism'],
  ['temporary', '/ˈtem.pər.ər.i/', 'sıfat', 'geçici', 'Lasting for only a limited time.', 'The bridge closure is temporary.', 'Köprü kapanışı geçicidir.', ['kalıcı', 'geçici', 'sonsuz'], 1, 'B1', ['brief', 'short-term'], 'melting ice cube'],
  ['consistent', '/kənˈsɪs.tənt/', 'sıfat', 'tutarlı', 'Acting in the same way over time.', 'Consistent practice improves skill.', 'Tutarlı pratik beceriyi geliştirir.', ['düzensiz', 'tutarlı', 'rastgele'], 1, 'B2', ['steady', 'reliable'], 'metronome ticking steady'],
  ['gradually', '/ˈɡrædʒ.u.ə.li/', 'zarf', 'yavaş yavaş', 'In a gradual way; slowly over time.', 'Temperatures rose gradually.', 'Sıcaklıklar yavaş yavaş yükseldi.', ['aniden', 'yavaş yavaş', 'asla'], 1, 'B1', ['slowly', 'steadily'], 'sunrise horizon timelapse'],
  ['primarily', '/praɪˈmer.əl.i/', 'zarf', 'öncelikle', 'For the most part; mainly.', 'The study focuses primarily on teens.', 'Çalışma öncelikle ergenlere odaklanıyor.', ['nadiren', 'öncelikle', 'hiç'], 1, 'B2', ['mainly', 'mostly'], 'spotlight stage center'],
  ['respectively', '/rɪˈspek.tɪv.li/', 'zarf', 'sırasıyla', 'In the order already mentioned.', 'A and B scored 10 and 12 respectively.', 'A ve B sırasıyla 10 ve 12 puan aldı.', ['birlikte', 'sırasıyla', 'tersine'], 1, 'B2', ['separately', 'individually'], 'numbered podium winners'],
  ['approximately', '/əˈprɒk.sɪ.mət.li/', 'zarf', 'yaklaşık olarak', 'Used to show a number is not exact.', 'The trip takes approximately two hours.', 'Yolculuk yaklaşık olarak iki saat sürer.', ['tam olarak', 'yaklaşık olarak', 'asla'], 1, 'B1', ['roughly', 'nearly'], 'measuring tape ruler'],
  ['furthermore', '/ˌfɜː.ðəˈmɔːr/', 'zarf', 'üstelik', 'In addition; besides.', 'The plan is cheap; furthermore, it is safe.', 'Plan ucuz; üstelik güvenli.', ['aksine', 'üstelik', 'yalnızca'], 1, 'B2', ['moreover', 'besides'], 'stacking wooden blocks'],
  ['nevertheless', '/ˌnev.ə.ðəˈles/', 'zarf', 'yine de', 'In spite of that; however.', 'It was raining; nevertheless, they hiked.', 'Yağmur yağıyordu; yine de yürüyüş yaptılar.', ['bu yüzden', 'yine de', 'çünkü'], 1, 'B2', ['however', 'nonetheless'], 'walking through rain'],
  ['acquire', '/əˈkwaɪər/', 'fiil', 'edinmek', 'To gain or obtain something.', 'Children acquire language naturally.', 'Çocuklar dili doğal olarak edinir.', ['kaybetmek', 'edinmek', 'silmek'], 1, 'B2', ['obtain', 'gain'], 'reading open book'],
  ['contribute', '/kənˈtrɪb.juːt/', 'fiil', 'katkıda bulunmak', 'To give something in order to help.', 'Volunteers contribute time and skill.', 'Gönüllüler zaman ve beceriyle katkıda bulunur.', ['engellemek', 'katkıda bulunmak', 'saklamak'], 1, 'B2', ['donate', 'assist'], 'teamwork puzzle pieces'],
  ['distinguish', '/dɪˈstɪŋ.ɡwɪʃ/', 'fiil', 'ayırt etmek', 'To recognize a difference.', 'Babies can distinguish faces early.', 'Bebekler yüzleri erken ayırt edebilir.', ['karıştırmak', 'ayırt etmek', 'unutmak'], 1, 'B2', ['differentiate', 'spot'], 'sorting colorful gems'],
  ['illustrate', '/ˈɪl.ə.streɪt/', 'fiil', 'örneklemek', 'To explain with examples or images.', 'Charts illustrate the trend clearly.', 'Grafikler eğilimi net biçimde örnekler.', ['gizlemek', 'örneklemek', 'iptal etmek'], 1, 'B2', ['demonstrate', 'depict'], 'artist sketching diagram'],
  ['negotiate', '/nɪˈɡəʊ.ʃi.eɪt/', 'fiil', 'müzakere etmek', 'To discuss in order to reach agreement.', 'Leaders negotiate a climate deal.', 'Liderler bir iklim anlaşmasını müzakere ediyor.', ['reddetmek', 'müzakere etmek', 'ertelemek'], 1, 'B2', ['bargain', 'mediate'], 'handshake conference table'],
  ['anticipate', '/ænˈtɪs.ɪ.peɪt/', 'fiil', 'önceden tahmin etmek', 'To expect or predict something.', 'Analysts anticipate stronger growth.', 'Analistler daha güçlü büyüme önceden tahmin ediyor.', ['yoksaymak', 'önceden tahmin etmek', 'inkâr etmek'], 1, 'B2/C1', ['expect', 'foresee'], 'telescope looking stars'],
  ['reinforce', '/ˌriː.ɪnˈfɔːs/', 'fiil', 'pekiştirmek', 'To strengthen or support.', 'Practice helps reinforce learning.', 'Pratik öğrenmeyi pekiştirmeye yardımcı olur.', ['zayıflatmak', 'pekiştirmek', 'silmek'], 1, 'B2/C1', ['strengthen', 'fortify'], 'steel bridge structure'],
  ['allocate', '/ˈæl.ə.keɪt/', 'fiil', 'tahsis etmek', 'To distribute for a particular purpose.', 'The city will allocate funds for parks.', 'Şehir parklara fon tahsis edecek.', ['israf etmek', 'tahsis etmek', 'saklamak'], 1, 'C1', ['assign', 'distribute'], 'pie chart slices'],
  ['compile', '/kəmˈpaɪl/', 'fiil', 'derlemek', 'To collect information into a list or book.', 'Researchers compile climate data yearly.', 'Araştırmacılar iklim verilerini her yıl derler.', ['dağıtmak', 'derlemek', 'silmek'], 1, 'B2/C1', ['gather', 'assemble'], 'library archive books'],
  ['decade', '/ˈdek.eɪd/', 'isim', 'on yıl', 'A period of ten years.', 'The city changed a lot in a decade.', 'Şehir bir on yılda çok değişti.', ['gün', 'on yıl', 'yüzyıl'], 1, 'B1', ['ten-year span', 'era'], 'spinning calendar pages'],
  ['priority', '/praɪˈɒr.ə.ti/', 'isim', 'öncelik', 'Something treated as more important.', 'Safety is the top priority.', 'Güvenlik en önemli önceliktir.', ['ayrıntı', 'öncelik', 'alışkanlık'], 1, 'B2', ['top concern', 'precedence'], 'checklist top star'],
  ['capacity', '/kəˈpæs.ə.ti/', 'isim', 'kapasite', 'The maximum amount something can contain or do.', 'The stadium reached full capacity.', 'Stadyum tam kapasiteye ulaştı.', ['eksiklik', 'kapasite', 'gecikme'], 1, 'B2', ['volume', 'capability'], 'filling glass beaker'],
  ['evidence', '/ˈev.ɪ.dəns/', 'isim', 'kanıt', 'Facts that support a belief or conclusion.', 'There is strong evidence for the theory.', 'Kuramı destekleyen güçlü kanıt vardır.', ['söylenti', 'kanıt', 'şüphe'], 1, 'B1', ['proof', 'clues'], 'magnifying glass fingerprint'],
  ['strategy', '/ˈstræt.ə.dʒi/', 'isim', 'strateji', 'A plan to achieve a long-term aim.', 'Their strategy focuses on renewable energy.', 'Stratejileri yenilenebilir enerjiye odaklanıyor.', ['tesadüf', 'strateji', 'hata'], 1, 'B2', ['plan', 'tactics'], 'chess knight move'],
];

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let out = `import type { VocabularyCard } from '@/types/vocabulary';\n`;
out += `import generatedVocabulary from '@/data/vocabularyGenerated.json';\n\n`;
out += `/** Curated B1–C2 English vocabulary cards for Dil Öğrenme Reels slides. */\n`;
out += `export const VOCABULARY_FACTS: VocabularyCard[] = [\n`;

words.forEach((w, i) => {
  const slug = w[0].replace(/[^a-z]/gi, '').toLowerCase();
  const id = `vocab-${String(i + 1).padStart(3, '0')}-${slug}`;
  out += `  {\n`;
  out += `    id: '${id}',\n`;
  out += `    category: 'vocabulary',\n`;
  out += `    word: '${esc(w[0])}',\n`;
  out += `    phonetic: '${esc(w[1])}',\n`;
  out += `    partOfSpeech: '${esc(w[2])}',\n`;
  out += `    cefrLevel: '${esc(w[9])}',\n`;
  out += `    synonyms: [${w[10].map((s) => `'${esc(s)}'`).join(', ')}],\n`;
  out += `    meaningTr: '${esc(w[3])}',\n`;
  out += `    definitionEn: '${esc(w[4])}',\n`;
  out += `    exampleEn: '${esc(w[5])}',\n`;
  out += `    exampleTr: '${esc(w[6])}',\n`;
  out += `    quizOptions: [${w[7].map((o) => `'${esc(o)}'`).join(', ')}],\n`;
  out += `    correctIndex: ${w[8]},\n`;
  out += `    gifQuery: '${esc(w[11])}',\n`;
  out += `  },\n`;
});

out += `];\n\n`;
out += `const VISUAL_QUERY_STOP_WORDS = new Set([\n`;
out += `  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by',\n`;
out += `  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',\n`;
out += `  'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'that', 'this',\n`;
out += `  'these', 'those', 'their', 'they', 'them', 'her', 'his', 'its', 'our', 'your', 'each',\n`;
out += `  'every', 'very', 'more', 'most', 'such', 'into', 'over', 'after', 'before', 'about',\n`;
out += `  'famous', 'become', 'modern', 'daily', 'present', 'appearing', 'found',\n`;
out += `]);\n\n`;
out += `function deriveVisualQuery(item: Partial<VocabularyCard>): string {\n`;
out += `  if (typeof item.gifQuery === 'string' && item.gifQuery.trim().length >= 3) {\n`;
out += `    return item.gifQuery.trim();\n`;
out += `  }\n`;
out += `  const tokens = \`\${item.exampleEn || ''} \${item.definitionEn || ''} \${item.word || ''}\`\n`;
out += `    .toLowerCase()\n`;
out += `    .replace(/[^a-z\\s]/g, ' ')\n`;
out += `    .split(/\\s+/)\n`;
out += `    .filter((token) => token.length >= 3 && !VISUAL_QUERY_STOP_WORDS.has(token));\n\n`;
out += `  const unique: string[] = [];\n`;
out += `  for (const token of tokens) {\n`;
out += `    if (!unique.includes(token)) {\n`;
out += `      unique.push(token);\n`;
out += `      if (unique.length >= 3) break;\n`;
out += `    }\n`;
out += `  }\n`;
out += `  if (unique.length >= 2) {\n`;
out += `    return unique.join(' ');\n`;
out += `  }\n`;
out += `  const cleanWord = String(item.word || '')\n`;
out += `    .toLowerCase()\n`;
out += `    .replace(/[^a-z]/g, '')\n`;
out += `    .trim();\n`;
out += `  return cleanWord ? \`\${cleanWord} concept\` : 'english learning';\n`;
out += `}\n\n`;
out += `function normalizeVocabularyCard(item: VocabularyCard): VocabularyCard {\n`;
out += `  const cefrLevel =\n`;
out += `    typeof item.cefrLevel === 'string' && item.cefrLevel.trim().length > 0\n`;
out += `      ? item.cefrLevel.trim().toUpperCase()\n`;
out += `      : 'B2';\n`;
out += `  const synonyms = Array.isArray(item.synonyms)\n`;
out += `    ? item.synonyms\n`;
out += `        .map((s) => String(s || '').trim())\n`;
out += `        .filter((s) => s.length > 0)\n`;
out += `        .slice(0, 3)\n`;
out += `    : [];\n`;
out += `  const gifQuery = deriveVisualQuery(item);\n\n`;
out += `  return {\n`;
out += `    ...item,\n`;
out += `    cefrLevel,\n`;
out += `    synonyms,\n`;
out += `    gifQuery,\n`;
out += `  };\n`;
out += `}\n\n`;
out += `function mergeVocabularyCards(): VocabularyCard[] {\n`;
out += `  const extras = Array.isArray(generatedVocabulary)\n`;
out += `    ? (generatedVocabulary as VocabularyCard[])\n`;
out += `    : [];\n`;
out += `  if (extras.length === 0) return VOCABULARY_FACTS;\n`;
out += `  const seen = new Set(VOCABULARY_FACTS.map((item) => item.word.toLowerCase()));\n`;
out += `  const merged = [...VOCABULARY_FACTS];\n`;
out += `  for (const rawItem of extras) {\n`;
out += `    if (!rawItem?.word || seen.has(String(rawItem.word).toLowerCase())) continue;\n`;
out += `    seen.add(String(rawItem.word).toLowerCase());\n`;
out += `    merged.push(normalizeVocabularyCard(rawItem));\n`;
out += `  }\n`;
out += `  return merged;\n`;
out += `}\n\n`;
out += `export function getVocabularyFacts(): VocabularyCard[] {\n`;
out += `  return mergeVocabularyCards();\n`;
out += `}\n\n`;
out += `export function findVocabularyById(id: string): VocabularyCard | undefined {\n`;
out += `  return getVocabularyFacts().find((item) => item.id === id);\n`;
out += `}\n`;

const target = path.join(__dirname, '..', 'data', 'vocabularyFacts.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out, 'utf8');
console.log(`Wrote ${words.length} vocabulary cards to ${target}`);
