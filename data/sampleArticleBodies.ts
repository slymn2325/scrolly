import type { Language } from '@/i18n/translations';

/**
 * Three existing cards, expanded from the claims already on those cards.
 * Other cards do not get invented copy.
 */
const SAMPLE_BODIES = {
  venus: {
    tr: `Venüs kartı, gün ile yılı aynı süre sanan alışkanlığı tersine çevirir. Burada gün, gezegenin kendi ekseni etrafında bir kez dönmesidir. Yıl, Güneş etrafındaki bir tam turdur. Kartın açılış cümlesi bu ikisini yan yana koyar: Venüs kendi ekseni etrafında o kadar yavaş döner ki, bir Venüs günü Güneş etrafındaki tam turundan, yani Venüs yılından, daha uzun sürer. Başlık da aynı karşılaştırmayı taşır. Uzun gövde, bu karşılaştırmayı yeni bir sayı eklemeden açar.

Kart iki süreyi Dünya günü cinsinden verir ve başka bir süre yazmaz. Güneş etrafındaki bir tam dönüş 225 Dünya günü sürer. Kendi ekseni etrafındaki bir dönüş 243 Dünya günü sürer. 243, 225'ten büyüktür. Eksen turu bu yüzden yörünge turundan uzun kalır ve kart, günü yıldan uzun diye özetler. Sayfadaki tahmin sürgüsü aynı eksen süresini sorar. Alt sınır 50, üst sınır 400 Dünya günüdür ve kartın doğru değeri 243 gündür. Sürgü, yörünge süresini değil, eksen dönüşünü sorar. Okur 225 ile 243'ü karıştırırsa karşılaştırma ters döner; kartın iddiası, büyük olanın eksen turu olduğudur.

Dönüşün yönü, sürelerin yanında duran ikinci olgudur. Venüs kendi ekseni etrafında ters yönde ve saat yönünde döner. Kart bunu çoğu gezegene göre ters diye ayırır. Yüzeyden bakılınca Güneş batıdan doğar ve doğudan batar. Bu, yılın günden kısa olmasıyla aynı cümle değildir. Biri iki turun uzunluğunu karşılaştırır. Diğeri dönüşün hangi yöne olduğunu söyler. İkisi de kartta aynı yavaş ve ters dönüşün sonuçları olarak durur. Biri diğerinin yerine konmaz.

Kartın sorusu, batıdan doğmanın nedenini sorar. Doğru seçenek, Venüs'ün kendi ekseni etrafında çoğu gezegene ters yönde dönmesidir. Yörüngenin Güneş'in içinden geçmesi bu kartta neden olarak verilmez. Atmosferin ışığı ayna gibi yansıtması da verilmez. Kaynak satırı NASA Planetary Fact Sheet'tir. Bu gövde 225 Dünya gününü, 243 Dünya gününü, saat yönündeki dönüşü ve batıdan doğup doğudan batmayı o kartın cümlelerinden tekrarlar. Yeni bir süre, yeni bir yön ya da kartta olmayan bir atmosfer ölçüsü eklemez.`,
    en: `This card pulls a Venus day apart from a Venus year. A day, on this card, is one turn of the planet on its own axis. A year is one full trip around the Sun. The opening sentence sets them side by side: Venus spins so slowly that a single day lasts longer than its entire orbit around the Sun. The title says the same thing. This longer note only unpacks that comparison. It does not add a third clock.

The card states both durations in Earth days and no others. One orbit around the Sun takes 225 Earth days. One spin on the axis takes 243 Earth days. 243 is greater than 225, so the spin outlasts the orbit, and that is why the card calls the day longer than the year. The slider on this page asks for that spin, not for the orbit. Its range runs from 50 to 400 Earth days, and the value the card marks as correct is 243. Reading 225 as the day, or 243 as the year, flips the claim. The card's claim is that the longer of the two figures is the spin.

Direction sits beside those two numbers. Venus spins backward compared with most planets, and the card describes that spin as clockwise. From the surface, the Sun rises in the west and sets in the east. A west sunrise is not the same statement as a day that outlasts a year. One compares the length of the two trips. The other says which way the planet turns. The card lists both as results of the same slow, backward spin. Neither result replaces the other.

The quiz asks why the Sun rises in the west and sets in the east. The choice the card marks as correct is that Venus spins backward on its axis compared with most planets. An orbit through the Sun is not the reason this card gives. Clouds that reflect sunlight upside down are not the reason either. The source line names the NASA Planetary Fact Sheet. This note repeats the 225 Earth days, the 243 Earth days, the backward spin, and the west sunrise from that card. It does not add another duration, another direction, or an atmosphere measurement the card does not state.`,
  },
  weld: {
    tr: `Bu kart, uzay boşluğunda iki temiz metal parçasının birbirine değdiğinde kalıcı olarak birleşebileceğini söyler. Birleşme için ısı, lehim veya yapıştırıcı yazılmaz. Kartın adı soğuk kaynaktır; İngilizce karşılığı cold welding olarak aynı kartta durur. Açılış cümlesi koşulu da verir: parçalar temizdir, ortam uzay boşluğudur ve temas kalıcı bir kaynaşma olur.

Dünya tarafı, metallerin arasında duran ince bir tabakayla anlatılır. Kart bu tabakayı oksit ve hava diye adlandırır. Atmosferdeki oksijen, metalin üzerinde atomların birbirine doğrudan değmesini kesen ince bir oksit tabakası oluşturur. Soru da bunu yoklar: Dünya'daki iki temiz çelik çubuk neden uzaydaki gibi kendiliğinden kaynamaz? Kartın doğru seçeneği, oksijenin o oksit tabakasını kurmasıdır. Yerçekiminin elektron paylaşmasını engellemesi bu kartta neden olarak verilmez. Oda sıcaklığındaki havanın metalleri bir eşiğin üzerinde tutması da verilmez.

Uzay boşluğunda o hava ve oksit bariyeri yoktur. Kart, metal atomlarının hangi atomun hangi parçaya ait olduğunu ayırt edemediğini ve iki yüzeyin tek bir parça gibi birleştiğini söyler. Aynı kartın İngilizce cümlesi birleşmeyi, iki yüzeydeki atomların elektron paylaşarak tek bir katıya bağlanması diye kurar. Koşul, temiz ve aynı metalin doğrudan temasıdır. Isı ve lehim bu anlatımda yoktur. Kart, her metal çiftini ya da boyalı bir yüzeyi bu işleme dahil etmez; anlattığı yüzey temiz ve çıplaktır.

Kaynak satırı European Space Agency (ESA) olarak durur. Bu gövde yalnızca şu karşıtlığı o karttan aktarır: Dünya'da oksit ve hava tabakası atomların doğrudan temasını keser, uzay boşluğunda bu bariyer olmayınca aynı metal tek parça gibi birleşir. Yeni bir sıcaklık, basınç, alaşım adı veya görev öyküsü eklemez.`,
    en: `This card says two pieces of the same bare metal can permanently fuse if they touch in the vacuum of space. It does not describe heat, solder, or glue. The name on the card is cold welding. The opening line also states the condition: the pieces are clean, the setting is vacuum, and the touch becomes a lasting join.

The Earth side of the card is a thin layer between the metals. The card calls that layer oxide and air. Oxygen in the atmosphere coats the metal and cuts off direct contact between atoms. The quiz asks why two clean steel beams do not weld together on Earth the way they do in space. The choice the card marks as correct is that oxygen forms a thin oxide and air barrier that keeps the metal atoms apart. Gravity pulling electron clouds downward is not the reason this card gives. Room temperature holding steel above a magnetic threshold is not the reason either.

In space that air and oxide barrier is missing. The card says the atoms can no longer tell which piece they belong to, so the two surfaces join as one piece. The English lines on the same card describe the join as atoms on both surfaces sharing electrons and bonding into one solid. The condition is clean, identical metal in direct contact. Heat and glue are absent from that account. The card does not extend the claim to every metal pair or to a painted surface. The surface it describes is clean and bare.

The source line names the European Space Agency (ESA). This note repeats only that contrast from the card: on Earth an oxide and air film blocks direct atomic contact, and without air in space the same metal fuses into one piece. It does not add a temperature, a pressure, an alloy name, or a mission story.`,
  },
  moon: {
    tr: `Bu kart, Ay'ın her yıl Dünya'dan yavaşça uzaklaştığını söyler. Tempo yaklaşık 3,8 santimetredir. Neden olarak Dünya okyanuslarındaki gelgit sürtünmesi yazılır. Başlık, açılış cümlesi ve tahmin sürgüsü aynı sayıyı taşır. Sürgünün alt sınırı 1, üst sınırı 15 santimetredir ve kartın doğru değeri 3,8 cm'dir. Gövde bu sayıyı başka bir hıza çevirmez.

Mekanizma kartta ardışık adımlarla durur. Ay'ın kütleçekimi Dünya'daki okyanusları çeker ve gelgit çıkıntıları oluşturur. Dünya kendi ekseni etrafında Ay'ın yörünge hızından daha hızlı döndüğü için bu su çıkıntıları Ay'ın tam hizasında değil, biraz önünde kalır. Öndeki çıkıntı Ay'ı yörüngesinde ileri doğru çeker. Kart bunu enerji aktarımı olarak yazar. Ay'a aktarılan enerji yörüngeyi genişletir ve Ay uzaklaşır. İngilizce metin aynı zinciri, dönüş enerjisinin daha geniş bir Ay yörüngesine taşınması diye kurar.

Uzaklaşmanın yönü bu aktarımdan gelir. Çıkıntı Ay'ı önden çektiği için kart, Ay'ın enerjisinin arttığını ve yörüngenin genişlediğini söyler. Daralan bir yörünge bu kartta yazmaz. Quiz, aynı adımı yoklar. Doğru seçenek, gelgit sürtünmesiyle Ay'a enerji aktarılmasıdır. Güneş rüzgarlarının Ay'ı dışarı itmesi bu kartta neden olarak verilmez. Dünya'nın kütlesinin zamanla azalması da verilmez.

Kaynak satırı NASA Science'tır. Bu gövde yıllık 3,8 santimetrelik uzaklaşmayı, okyanus çıkıntılarının Ay'dan önde durmasını ve bu çekmenin yörüngeyi genişletmesini o kartın cümlelerinden tekrarlar. Başka bir hız, başka bir kuvvet veya kartta olmayan bir jeolojik sonuç eklemez.`,
    en: `This card says the Moon drifts slowly away from Earth every year. The pace it gives is about 3.8 centimeters, and the cause it names is tidal friction in Earth's oceans. The title, the opening sentence, and the slider all carry that same figure. The slider runs from 1 to 15 centimeters, and the value the card marks as correct is 3.8 cm. This note does not convert that pace into another speed.

The mechanism is a short chain, and every link is on the card. The Moon's gravity pulls on Earth's oceans and raises tidal bulges. Earth rotates on its axis faster than the Moon orbits, so those bulges of water sit slightly ahead of the Moon instead of directly in line with it. The leading bulge tugs the Moon forward along its orbit. The card calls that tug a transfer of energy. Energy added to the Moon widens the orbit, and the Moon moves farther away. The English lines describe the same chain as rotational energy carried into a wider lunar orbit.

The direction of the drift comes from that transfer. Because the bulge pulls the Moon forward, the card says the Moon gains energy and the orbit grows wider. A shrinking orbit is not what this card states. The quiz checks the same step. The choice it marks as correct is tidal friction transferring rotational energy to the Moon. Solar wind pushing the Moon outward is not the cause this card gives. Earth's mass steadily decreasing is not the cause either.

The source line names NASA Science. This note repeats the yearly 3.8 centimeter drift, the ocean bulges that lead the Moon, and the forward tug that widens the orbit. It does not add another speed, another force, or a geological result the card does not state.`,
  },
} as const;

const SAMPLE_KEYS: Record<string, keyof typeof SAMPLE_BODIES> = {
  'space-01': 'venus',
  'venuste-bir-gun-bir-yildan-uzundur': 'venus',
  'a-day-on-venus-is-longer-than-a-year': 'venus',
  'space-06': 'weld',
  'uzayda-soguk-kaynak-olayi': 'weld',
  'cold-welding-in-outer-space': 'weld',
  'gen-the-moon-is-slowly-drifting-away-from-earth': 'moon',
  'the-moon-is-slowly-drifting-away-from-earth': 'moon',
};

export function getSampleArticleBody(keys: Array<string | undefined>, lang: Language): string {
  for (const key of keys) {
    if (!key) continue;
    const sampleId = SAMPLE_KEYS[key.trim()];
    if (!sampleId) continue;
    return SAMPLE_BODIES[sampleId][lang];
  }
  return '';
}
