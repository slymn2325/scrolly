/**
 * Autonomous bilingual (TR & EN) verified scientific fact reservoir and
 * deterministic parametric synthesizer for Scrolly (scrolly.live).
 *
 * Used automatically whenever GitHub Models / remote inference endpoints are
 * unavailable, sunsetted, rate-limited, or return non-JSON text (e.g. "OK").
 */

const CATEGORIES = ['space', 'nature', 'human_body', 'history', 'science', 'records'];

export const VERIFIED_FACT_RESERVOIR = [
  // ======================= SPACE (6+) =======================
  {
    slug: 'olympus-mons-three-times-everest',
    category: 'space',
    title_tr: "Mars'taki Olympus Mons, Everest'in Neredeyse 3 Katı Yüksekliğinde",
    title_en: 'Olympus Mons on Mars Towers Nearly Three Times Higher Than Everest',
    summary_tr:
      "Güneş Sistemi'nin bilinen en büyük yanardağı Olympus Mons yaklaşık 21,9 km yüksekliğindedir ve tabanı bütün bir ülkeyi kaplayacak kadar geniştir.",
    summary_en:
      'Standing roughly 21.9 km tall above Martian datum, Olympus Mons is the largest volcano in the solar system, with a base wide enough to span France.',
    detail_tr:
      "Mars'ta Dünya'daki gibi hareket eden tektonik plakalar bulunmadığı için manto sıcak noktası milyonlarca yıl boyunca aynı bölgeye lav pompaladı. Düşük yerçekimi de bu dev kalkan yanardağının kendi ağırlığı altında çökmeden 21,9 km yüksekliğe ulaşmasını sağladı.",
    detail_en:
      'Because Mars lacks shifting tectonic plates like Earth, a stationary mantle hotspot kept erupting lava in one spot for millions of years. Lower Martian gravity also allowed the shield volcano to grow to 21.9 km without collapsing under its own weight.',
    question_tr: "Mars'taki Olympus Mons yanardağının yüksekliği yaklaşık kaç kilometredir?",
    question_en: 'Approximately how tall is Olympus Mons on Mars in kilometers?',
    unit_tr: 'km',
    unit_en: 'km',
    min_val: 8,
    max_val: 40,
    answer_val: 22,
    sketch_type: 'olympus_mons',
    source_name: 'NASA Science — Mars Exploration',
    source_url: 'https://science.nasa.gov/mars/facts/',
  },
  {
    slug: 'iss-completes-16-sunrises-daily',
    category: 'space',
    title_tr: 'Uluslararası Uzay İstasyonu Günde 16 Gün Doğumu Görüyor',
    title_en: 'Astronauts on the ISS Witness 16 Sunrises Every Single Day',
    summary_tr:
      'Saatte yaklaşık 27.600 km hızla Dünya çevresinde dönen istasyon, her 92 dakikada bir tam tur atarak astronotlara günde 16 kez gün doğumu yaşatır.',
    summary_en:
      'Orbiting Earth at roughly 27,600 km/h, the International Space Station completes one full lap every ~92 minutes, giving crews 16 sunrises and sunsets daily.',
    detail_tr:
      'Yerden yaklaşık 408 km yukarıda yerçekimi düşüklüğü nedeniyle sürekli serbest düşüş halinde olan istasyon, yerçekimine karşı dengede kalabilmek için saniyede 7,66 km yatay hızla hareket etmek zorundadır.',
    detail_en:
      'Flying around 408 km above Earth, the station stays in continuous free-fall orbit by maintaining a horizontal velocity of 7.66 km per second, completing roughly 15.5 to 16 orbits per 24-hour Earth day.',
    question_tr: 'ISS mürettebatı 24 saat içinde yaklaşık kaç kez gün doğumu görür?',
    question_en: 'Roughly how many sunrises does the ISS crew see in a 24-hour day?',
    unit_tr: 'kez',
    unit_en: 'times',
    min_val: 2,
    max_val: 30,
    answer_val: 16,
    sketch_type: 'iss',
    source_name: 'NASA — International Space Station Facts',
    source_url: 'https://www.nasa.gov/international-space-station/',
  },
  {
    slug: 'jupiter-great-red-spot-wider-than-earth',
    category: 'space',
    title_tr: "Jüpiter'in Büyük Kırmızı Lekesi Dünya'yı Yutabilecek Boyutta",
    title_en: "Jupiter's Great Red Spot Is a Centuries-Old Storm Larger Than Earth",
    summary_tr:
      "Jüpiter'deki dev antisiklon fırtınası yaklaşık 16.350 km genişliğiyle Dünya'nın çapından büyüktür ve en az 300 yılı aşkın süredir dönmektedir.",
    summary_en:
      'Spanning roughly 16,350 km across, Jupiter’s Great Red Spot is a high-pressure anticyclone wider than Earth that has raged for over 300 years.',
    detail_tr:
      "Dünya'daki kasırgalar karaya ya da soğuk sulara çarpınca sürtünmeyle dağılır. Gaz devi Jüpiter'de katı bir yüzey olmadığı için sürtünme çok düşüktür; bu da saatte 430 km'yi aşan rüzgarların yüzyıllarca sürmesini sağlar.",
    detail_en:
      'Unlike hurricanes on Earth that dissipate over solid land, gas giant Jupiter has no solid ground to slow winds down. With winds exceeding 430 km/h, atmospheric jet streams keep this giant vortex spinning for centuries.',
    question_tr: 'Büyük Kırmızı Leke yaklaşık kaç bin km genişliğindedir?',
    question_en: 'Roughly how many thousand kilometers wide is Jupiter’s Great Red Spot?',
    unit_tr: 'bin km',
    unit_en: 'k km',
    min_val: 5,
    max_val: 35,
    answer_val: 16,
    sketch_type: 'orbit',
    source_name: 'NASA Science — Jupiter Overview',
    source_url: 'https://science.nasa.gov/jupiter/',
  },
  {
    slug: 'moon-drifts-away-3-8-cm-yearly',
    category: 'space',
    title_tr: "Ay Her Yıl Dünya'dan 3,8 Santimetre Uzaklaşıyor",
    title_en: 'The Moon Slowly Drifts Away From Earth by 3.8 cm Every Year',
    summary_tr:
      'Apollo görevlerinin Ay yüzeyine bıraktığı lazer aynaları sayesinde ölçülen bu kayma, okyanus gelgitlerinin açısal momentum aktarımından kaynaklanır.',
    summary_en:
      'Measured using laser retroreflectors left by Apollo astronauts, tidal friction between Earth’s oceans and Moon gradually pushes our satellite outward by 3.8 cm per year.',
    detail_tr:
      "Ay'ın çekimi Dünya okyanuslarında gelgit şişkinlikleri yaratır; Dünya ise kendi ekseninde daha hızlı döndüğü için bu su şişkinliğini Ay'ın önüne doğru sürükler. Önde kalan su kütlesi Ay'a ileri yönde çekim uygulayarak yörüngesini büyütür.",
    detail_en:
      'Earth rotates faster than the Moon orbits, dragging tidal ocean bulges slightly ahead of the Moon. That leading water mass pulls forward on the Moon gravitationally, boosting its orbit while imperceptibly lengthening our days.',
    question_tr: "Ay her yıl Dünya'dan yaklaşık kaç milimetre uzaklaşmaktadır?",
    question_en: 'About how many millimeters does the Moon drift away from Earth each year?',
    unit_tr: 'mm',
    unit_en: 'mm',
    min_val: 5,
    max_val: 90,
    answer_val: 38,
    sketch_type: 'footprint',
    source_name: 'NASA Science — Earth’s Moon',
    source_url: 'https://science.nasa.gov/moon/',
  },
  {
    slug: 'sgr-a-star-black-hole-4-million-suns',
    category: 'space',
    title_tr: 'Samanyolu Merkezindeki Kara Delik 4 Milyon Güneş Kütlesinde',
    title_en: 'Our Galaxy’s Central Black Hole Packs 4 Million Solar Masses',
    summary_tr:
      'Event Horizon Teleskobu ile görüntülenen Sagittarius A*, yalnızca Merkür yörüngesi kadar alana 4 milyondan fazla Güneş kütlesi sığdırır.',
    summary_en:
      'Directly imaged by the Event Horizon Telescope, Sagittarius A* compresses roughly 4 million times the mass of our Sun inside a compact gravitational boundary.',
    detail_tr:
      'Gökbilimciler S2 adlı yıldızın 26.000 ışık yılı ötedeki görünmez bir merkezin çevresinde saniyede 7.600 km hızla döndüğünü izleyerek bu süper kütleli kara deliğin kütlesini hassas biçimde hesapladı.',
    detail_en:
      'Astronomers measured the orbit of star S2 whipping around this invisible core 26,000 light-years away at speeds nearing 7,600 km/s, proving an ultra-compact mass of four million suns resides there.',
    question_tr: 'Sagittarius A* kara deliği yaklaşık kaç milyon Güneş kütlesindedir?',
    question_en: 'Roughly how many million solar masses is Sagittarius A*?',
    unit_tr: 'milyon Güneş',
    unit_en: 'M suns',
    min_val: 1,
    max_val: 15,
    answer_val: 4,
    sketch_type: 'black_hole',
    source_name: 'ESO — Event Horizon Telescope',
    source_url: 'https://www.eso.org/public/news/eso2208-eht-mw/',
  },
  {
    slug: 'saturn-hexagon-jet-stream-north-pole',
    category: 'space',
    title_tr: "Satürn'ün Kuzey Kutbunda Dünya'dan Büyük Dev Bir Altıgen Var",
    title_en: "Saturn's North Pole Hosts a Persistent Giant Hexagon Wider Than Earth",
    summary_tr:
      'Cassini uzay aracının görüntülediği yaklaşık 29.000 km çapındaki bu geometrik jet akımı, on yıllardır kusursuz altıgen formunu koruyor.',
    summary_en:
      'Captured in crisp detail by NASA’s Cassini probe, a 29,000-km-wide atmospheric jet stream locks Saturn’s north polar clouds into a nearly symmetrical six-sided hexagon.',
    detail_tr:
      'Akışkanlar dinamiği deneyleri, farklı hızlarda dönen eş merkezli rüzgar katmanları arasında duran dalgalar (standing Rossby waves) oluştuğunda akışın kendiliğinden kararlı çokgenlere kilitlendiğini göstermiştir.',
    detail_en:
      'Fluid-dynamics research shows that steep wind-speed gradients around a rotating planet naturally trap atmospheric Rossby waves into stable standing polygons—creating a six-sided jet stream spinning for decades.',
    question_tr: "Satürn'ün kuzey kutbundaki dev fırtına kaç kenarlı geometrik şekildir?",
    question_en: 'How many sides does the giant polar jet stream pattern on Saturn have?',
    unit_tr: 'kenar',
    unit_en: 'sides',
    min_val: 3,
    max_val: 10,
    answer_val: 6,
    sketch_type: 'saturn',
    source_name: 'NASA Science — Saturn Hexagon',
    source_url: 'https://science.nasa.gov/saturn/',
  },

  // ======================= NATURE (6+) =======================
  {
    slug: 'tardigrades-survive-vacuum-and-boiling-heat',
    category: 'nature',
    title_tr: 'Su Ayıları (Tardigradlar) Uzay Boşluğunda Bile Hayatta Kalabiliyor',
    title_en: 'Microscopic Tardigrades Can Survive the Open Vacuum of Outer Space',
    summary_tr:
      'Yarım milimetrelik bu canlılar vücut sularının %95’ini atıp "tun" uykusuna geçerek 150 °C ısıya, -200 °C soğuğa ve kozmik radyasyona dayanır.',
    summary_en:
      'Half-millimeter-long water bears expel over 95% of their body water to enter a glass-like "tun" state, enduring temperatures from -200 °C to 150 °C and space radiation.',
    detail_tr:
      'Kuruduklarında hücre zarlarını özel vitrifiye proteinlerle camsı bir kalkan içine alırlar; ayrıca "Dsup" adlı benzersiz bir protein DNA sarmalını sararak yüksek enerjili radyasyon kırılmalarını önler.',
    detail_en:
      'During dehydration, tardigrades replace lost water with protective bioglass proteins while a unique DNA-shielding protein called Dsup minimizes double-strand breaks even under intense ultraviolet and ionizing radiation.',
    question_tr: 'Tardigradlar kuruduklarında vücut sularının yaklaşık yüzde kaçını atabilir?',
    question_en: 'Roughly what percentage of body water can tardigrades shed in tun state?',
    unit_tr: '%',
    unit_en: '%',
    min_val: 40,
    max_val: 99,
    answer_val: 95,
    sketch_type: 'tardigrade',
    source_name: 'ESA — Tardigrades in Space',
    source_url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Tiny_animals_survive_exposure_to_space',
  },
  {
    slug: 'immortal-jellyfish-resets-cellular-clock',
    category: 'nature',
    title_tr: 'Ölümsüz Denizanası Yaşlandığında Hücrelerini Bebek Evresine Çeviriyor',
    title_en: 'The Immortal Jellyfish Can Reset Its Cells Back to Youthful Polyps',
    summary_tr:
      'Turritopsis dohrnii adlı Akdeniz denizanası yaralandığında veya strese girdiğinde yetişkin hücrelerini yeniden programlayıp polip evresine döner.',
    summary_en:
      'When injured or stressed, the tiny jellyfish Turritopsis dohrnii reverses its life cycle—reprogramming adult specialized cells back into a youthful polyp colony.',
    detail_tr:
      'Transdiferansiyasyon adı verilen bu süreç sayesinde sinir veya kas hücreleri kimliğini sıfırlayıp yepyeni bir genç koloni oluşturur; avcılar tarafından yenmediği sürece biyolojik yaşlanma döngüsünü teorik olarak sonsuz kez tekrarlar.',
    detail_en:
      'Through cellular transdifferentiation, mature muscle and nerve cells morph back into unspecialized stem-like cells. Unless eaten or infected, the organism can repeat this biological reset indefinitely.',
    question_tr: 'Ölümsüz denizanası yaklaşık kaç milimetre çapındadır?',
    question_en: 'Roughly how many millimeters wide is an adult Turritopsis dohrnii jellyfish?',
    unit_tr: 'mm',
    unit_en: 'mm',
    min_val: 1,
    max_val: 40,
    answer_val: 5,
    sketch_type: 'immortal_jellyfish',
    source_name: 'Natural History Museum — Immortal Jellyfish',
    source_url: 'https://www.nhm.ac.uk/discover/immortal-jellyfish-secret-to-cheating-death.html',
  },
  {
    slug: 'blue-whale-heart-weighs-around-180-kg',
    category: 'nature',
    title_tr: 'Mavi Balinanın Kalbi Bir Küçük Otomobil Büyüklüğünde ve 180 kg',
    title_en: 'A Blue Whale Heart Weighs Roughly 180 kg and Beats Twice a Minute Underwater',
    summary_tr:
      'Dünya tarihinin bilinen en büyük hayvanı olan mavi balina derin dalış sırasında kalp atışını dakikada 2 vuruşa kadar düşürerek oksijen tasarrufu yapar.',
    summary_en:
      'Earth’s largest known animal slows its ~180 kg heart to as few as two beats per minute during deep dives so muscles stay oxygenated without surfacing.',
    detail_tr:
      'Araştırmacılar vakumlu etiketlerle yaptıkları EKG kaydında bir mavi balinanın dalış tabanında nabzının dakikada 2’ye indiğini, yüzeye nefes almak için çıktığında ise 37 atıma sıçradığını ölçtü.',
    detail_en:
      'Using suction-cup ECG tags off California, Stanford and NOAA researchers recorded a blue whale’s heart rate dropping to 2 bpm at depth before rebounding to 37 bpm near the surface.',
    question_tr: 'Derin dalış yapan bir mavi balinanın kalbi dakikada en az kaç kez atabilir?',
    question_en: 'How low (beats per minute) can a diving blue whale’s heart rate drop?',
    unit_tr: 'atım/dk',
    unit_en: 'bpm',
    min_val: 1,
    max_val: 40,
    answer_val: 2,
    sketch_type: 'whale',
    source_name: 'Stanford / PNAS — Blue Whale Heartbeat Study',
    source_url: 'https://news.stanford.edu/stories/2019/11/first-ever-recording-blue-whales-heart-rate',
  },
  {
    slug: 'sloths-hold-breath-longer-than-dolphins',
    category: 'nature',
    title_tr: 'Tembel Hayvanlar Su Altında Nefesini Yunuslardan Uzun Tutabiliyor',
    title_en: 'Sloths Can Hold Their Breath Underwater Longer Than Dolphins',
    summary_tr:
      'Kalp atışlarını normal hızın üçte birine düşürebilen üç parmaklı tembel hayvanlar su altında nefeslerini tam 40 dakika boyunca tutabilir.',
    summary_en:
      'By slowing their resting heart rate down to a third of normal pace, three-toed sloths can stay submerged on a single breath for up to 40 minutes.',
    detail_tr:
      'Yunuslar her 8-10 dakikada bir yüzeye çıkıp nefes almak zorunda kalırken aşırı yavaş metabolizmaya sahip tembel hayvanlar oksijen tüketimini minimuma indirir; ayrıca suda karadakinden üç kat hızlı yüzerler.',
    detail_en:
      'While dolphins typically surface every 8–10 minutes to breathe, a sloth’s ultra-slow metabolic rate drastically reduces oxygen demand—and their long arms propel them through water three times faster than on land.',
    question_tr: 'Tembel hayvanlar su altında nefesini en fazla kaç dakika tutabilir?',
    question_en: 'Up to how many minutes can a three-toed sloth hold its breath underwater?',
    unit_tr: 'dk',
    unit_en: 'min',
    min_val: 5,
    max_val: 60,
    answer_val: 40,
    sketch_type: 'sloth',
    source_name: 'Britannica — Three-Toed Sloth Biology',
    source_url: 'https://www.britannica.com/animal/sloth',
  },
  {
    slug: 'monarch-butterflies-navigate-4000-km-compass',
    category: 'nature',
    title_tr: 'Kral Kelebekleri Antenlerindeki Güneş Saatiyle 4.000 km Göç Ediyor',
    title_en: 'Monarch Butterflies Use Antenna Sun-Compasses to Migrate 4,000 km',
    summary_tr:
      'Yalnızca birkaç gram ağırlığındaki kral kelebekleri dört nesil boyunca süren yolculukta hiç görmedikleri Meksika ormanlarını hatasız bulur.',
    summary_en:
      'Weighing under half a gram, monarch butterflies use circadian clocks embedded in their antennae to steer up to 4,000 km to ancestral winter forests in Mexico.',
    detail_tr:
      'Antenlerde bulunan ışığa duyarlı biyolojik saat proteinleri Güneş’in gökyüzündeki açısını günün saatiyle eşleştirir; bulutlu günlerde ise Dünya’nın manyetik alanını algılayan yedek pusulaları devreye girer.',
    detail_en:
      'Light-sensitive circadian clock proteins inside monarch antennae continually adjust flight bearings for the Sun’s movement across the sky, backed up by a magnetic-inclination compass on overcast days.',
    question_tr: 'Kral kelebeklerinin Kuzey Amerika’daki göç rotası yaklaşık kaç bin km sürer?',
    question_en: 'Roughly how many thousand kilometers do monarch butterflies migrate?',
    unit_tr: 'bin km',
    unit_en: 'k km',
    min_val: 1,
    max_val: 10,
    answer_val: 4,
    sketch_type: 'honeybee',
    source_name: 'USDA Forest Service — Monarch Butterfly Migration',
    source_url: 'https://www.fs.usda.gov/wildflowers/pollinators/Monarch_Butterfly/migration/index.shtml',
  },
  {
    slug: 'pistol-shrimp-snaps-bubble-hotter-than-sun',
    category: 'nature',
    title_tr: 'Tabanca Karidesinin Kıskacındaki Baloncuk Güneş Yüzeyinden Sıcak',
    title_en: 'The Pistol Shrimp’s Snapping Bubble Briefly Reaches Solar Surface Heat',
    summary_tr:
      'Dev kıskacını saniyenin binde birinde kapatan karides, çöken bir kavitasyon baloncuğuyla anlık 4.700 °C sıcaklık ve ışık parlaması üretir.',
    summary_en:
      'Snapping its oversized claw shut in under a millisecond fires a high-velocity water jet whose collapsing cavitation bubble hits roughly 4,700 °C with a flash of light.',
    detail_tr:
      'Su jeti arkada düşük basınçlı buhar kabarcığı oluşturur; kabarcık çevredeki su basıncıyla içe çöktüğünde sonolüminesans etkisiyle kısa süreli yüksek sıcaklık ve 210 desibellik şok dalgası avı sersemletir.',
    detail_en:
      'As the cavitation bubble violently implodes, compressed gas undergoes sonoluminescence—producing a microscopic flash near 4,700 °C and a 210-decibel acoustic shockwave strong enough to stun small prey.',
    question_tr: 'Tabanca karidesi baloncuğunun ürettiği şok dalgası yaklaşık kaç desibeldir?',
    question_en: 'Approximately how loud in decibels is a pistol shrimp’s shockwave?',
    unit_tr: 'dB',
    unit_en: 'dB',
    min_val: 90,
    max_val: 250,
    answer_val: 210,
    sketch_type: 'shark',
    source_name: 'University of Twente / Nature — Snapping Shrimp Cavitation',
    source_url: 'https://www.nature.com/articles/35097152',
  },

  // ======================= HUMAN BODY (6+) =======================
  {
    slug: 'human-liver-regenerates-from-quarter-tissue',
    category: 'human_body',
    title_tr: 'İnsan Karaciğeri %25’i Kalsa Bile Tam Boyutuna Yeniden Büyüyebiliyor',
    title_en: 'Your Liver Can Fully Regenerate Even If Just 25% of Its Tissue Remains',
    summary_tr:
      'İnsan vücudundaki iç organlar arasında bu ölçekte kendi kütlesini yenileyebilen tek organ olan karaciğer, hasardan haftalar sonra eski hacmine ulaşır.',
    summary_en:
      'The human liver is the only internal organ capable of regenerating back to full functional mass even when up to 70–75% of its tissue is surgically removed.',
    detail_tr:
      'Kök hücre bölünmesinden ziyade mevcut olgun karaciğer hücreleri (hepatositler) uyku modundan çıkarak hızla çoğalır; kan damarı sinyalleri organ tam metabolik kapasiteye ulaştığında büyümeyi otomatik durdurur.',
    detail_en:
      'Instead of relying only on reserve stem cells, mature hepatocytes re-enter the cell cycle rapidly after tissue loss, guided by blood-flow signals that halt division precisely once original mass is restored.',
    question_tr: 'Karaciğerin tam boyuta ulaşabilmesi için en az yüzde kaçının kalması yeterlidir?',
    question_en: 'What minimum percentage of liver tissue is enough to regenerate back to full size?',
    unit_tr: '%',
    unit_en: '%',
    min_val: 5,
    max_val: 80,
    answer_val: 25,
    sketch_type: 'liver',
    source_name: 'NIH / PubMed Central — Liver Regeneration Mechanisms',
    source_url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2701258/',
  },
  {
    slug: 'human-eye-distinguishes-10-million-colors',
    category: 'human_body',
    title_tr: 'İnsan Gözü Yaklaşık 10 Milyon Farklı Renk Tonunu Ayırt Edebiliyor',
    title_en: 'The Human Eye Can Distinguish Roughly 10 Million Distinct Color Shades',
    summary_tr:
      'Retinadaki üç temel koni hücresi (kırmızı, yeşil, mavi) beyindeki görsel kortekste kombine edilerek milyonlarca ince renk geçişi oluşturur.',
    summary_en:
      'Signals from just three cone photoreceptor types (red, green, and blue) combine in your visual cortex to separate roughly 10 million distinct color hues.',
    detail_tr:
      'Her koni tipi spektrumun farklı dalga boylarına duyarlıdır ve beyin bunların göreceli ateşlenme oranlarını karşılaştırarak ara tonları hesaplar; bu nedenle ekranlardaki sadece üç RGB alt pikseli bize tüm gökkuşağını gösterebilir.',
    detail_en:
      'Your brain calculates color by comparing relative firing ratios among S, M, and L cones rather than measuring single wavelengths directly—explaining why three RGB subpixels on a screen reproduce millions of perceived hues.',
    question_tr: 'İnsan retinasında renkli görüşü sağlayan kaç temel koni hücresi tipi vardır?',
    question_en: 'How many main types of color-sensing cone cells operate in the human retina?',
    unit_tr: 'tip',
    unit_en: 'types',
    min_val: 1,
    max_val: 10,
    answer_val: 3,
    sketch_type: 'eye',
    source_name: 'National Eye Institute (NIH) — How the Eyes Work',
    source_url: 'https://www.nei.nih.gov/learn-about-eye-health/healthy-vision/how-eyes-work',
  },
  {
    slug: 'human-sweat-glands-exceed-two-million',
    category: 'human_body',
    title_tr: 'Vücudunuzda 2 ila 4 Milyon Arasında Ter Bezi Çalışıyor',
    title_en: 'Your Skin Houses Between 2 Million and 4 Million Active Sweat Glands',
    summary_tr:
      'İnsanların memeliler arasındaki en verimli soğutma sistemi olan bu bezler, buharlaşma yoluyla beyin ve kas ısısını kritik sınırın altında tutar.',
    summary_en:
      'Humans possess 2 to 4 million eccrine sweat glands—the most potent evaporative cooling network among primates, letting us dissipate heat continuously on the move.',
    detail_tr:
      'Birçok memeli yalnızca hızlı soluyarak soğurken ekrin ter bezleri yoğun kıl örtüsünden arınmış insan derisinde suyu doğrudan yüzeye çıkarır; bu adaptasyon atalarımızın uzun mesafe koşabilmesini sağlamıştır.',
    detail_en:
      'While furry mammals rely heavily on panting to dump heat, millions of eccrine glands across bare human skin turn perspiration into rapid evaporative cooling—key to human endurance running.',
    question_tr: 'İnsan derisinde yaklaşık kaç milyon ter bezi bulunur (alt-üst sınır ortalaması)?',
    question_en: 'Roughly how many million sweat glands sit across human skin on average?',
    unit_tr: 'milyon',
    unit_en: 'million',
    min_val: 1,
    max_val: 10,
    answer_val: 3,
    sketch_type: 'sweat',
    source_name: 'MedlinePlus / NIH — Sweat Glands & Thermoregulation',
    source_url: 'https://medlineplus.gov/sweat.html',
  },
  {
    slug: 'human-neurons-fire-at-over-400-kmh',
    category: 'human_body',
    title_tr: 'Sinir Sinyalleriniz Beyinden Kaslara Saatte 430 km Hızla Ulaşır',
    title_en: 'Myelinated Nerve Impulses Zip Through Your Body at Up to 430 km/h',
    summary_tr:
      'Miyelin kılıfıyla yalıtılmış hızlı sinir lifleri elektriksel uyarıları saniyede 120 metre hızla ileterek reflekslerin anında çalışmasını sağlar.',
    summary_en:
      'Insulated by fatty myelin sheaths, your fastest motor and proprioceptive nerves relay electrical signals at 120 meters per second—over 430 km/h.',
    detail_tr:
      'Elektrik akımı akson boyunca kesintisiz ilerlemek yerine "Ranvier boğumları" adı verilen boşluklar arasında sıçramalı iletim (saltatory conduction) yapar; bu biyolojik hile iletim hızını on kat artırır.',
    detail_en:
      'Rather than traveling smoothly along bare membranes, action potentials leap from node to node across myelin gaps in "saltatory conduction," multiplying impulse speed more than tenfold.',
    question_tr: 'Miyelinli hızlı sinir liflerinde ileti hızı saniyede yaklaşık kaç metreye çıkar?',
    question_en: 'Up to roughly how many meters per second can fast myelinated nerve signals travel?',
    unit_tr: 'm/sn',
    unit_en: 'm/s',
    min_val: 10,
    max_val: 200,
    answer_val: 120,
    sketch_type: 'brain',
    source_name: 'NINDS / NIH — Brain Basics: Know Your Brain',
    source_url: 'https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-know-your-brain',
  },
  {
    slug: 'body-replaces-millions-of-red-blood-cells-second',
    category: 'human_body',
    title_tr: 'Kemik İliğiniz Her Saniye Yaklaşık 2 Milyon Alyuvar Üretiyor',
    title_en: 'Your Bone Marrow Produces Roughly 2 Million Red Blood Cells Every Second',
    summary_tr:
      'Sadece birkaç dakika içinde bile yüz milyonlarca oksijen taşıyıcı hücre üretilir; ömrü yaklaşık 120 gün olan alyuvarlar sürekli yenilenir.',
    summary_en:
      'Every second, stem cells inside red bone marrow release roughly 2 million fresh red blood cells into your bloodstream to replace cells wearing out after 120 days.',
    detail_tr:
      'Çekirdeklerini olgunlaşırken atan bu disk şeklindeki hücreler oksijen bağlayan hemoglobin molekülleriyle doludur; yüksek irtifaya çıkıldığında böbreklerin salgıladığı EPO hormonu üretim hızını daha da artırır.',
    detail_en:
      'Red blood cells shed their nuclei to pack in maximum oxygen-carrying hemoglobin. When oxygen drops at high altitude, kidney-released EPO hormone accelerates marrow production automatically.',
    question_tr: 'Bir insan alyuvarının kan dolaşımındaki ortalama ömrü yaklaşık kaç gündür?',
    question_en: 'What is the average lifespan of a human red blood cell in days?',
    unit_tr: 'gün',
    unit_en: 'days',
    min_val: 20,
    max_val: 240,
    answer_val: 120,
    sketch_type: 'vessels',
    source_name: 'National Heart, Lung, and Blood Institute (NIH)',
    source_url: 'https://www.nhlbi.nih.gov/health/blood',
  },
  {
    slug: 'human-dna-uncoiled-reaches-pluto-and-back',
    category: 'human_body',
    title_tr: "Vücudunuzdaki Tüm DNA Uç Uca Eklense Plüton'a Gidip Döner",
    title_en: 'All the DNA in Your Body Uncoiled Could Stretch to Pluto and Back',
    summary_tr:
      'Her bir hücrenizdeki yaklaşık 2 metrelik DNA, vücuttaki trilyonlarca çekirdekli hücreyle çarpıldığında Güneş Sistemi’ni aşan milyarlarca kilometrelik uzunluğa ulaşır.',
    summary_en:
      'Packed inside nearly every cell sits about 2 meters of tightly coiled DNA; summed across tens of trillions of cells, the total strand spans billions of kilometers.',
    detail_tr:
      'Bu olağanüstü paketleme "histon" adlı makara proteinleri sayesinde gerçekleşir; iki metre uzunluğundaki genetik şerit yalnızca birkaç mikrometre genişliğindeki hücre çekirdeğine dolanmadan sığdırılır.',
    detail_en:
      'Histone spool proteins fold each two-meter genetic thread into dense chromatin loops inside a nucleus just micrometers wide, letting tens of trillions of copies fit effortlessly inside one human body.',
    question_tr: 'Tek bir insan hücresindeki DNA tamamen açılsa yaklaşık kaç metre uzunluğundadır?',
    question_en: 'If uncoiled, roughly how many meters long is the DNA inside a single human cell?',
    unit_tr: 'metre',
    unit_en: 'm',
    min_val: 1,
    max_val: 10,
    answer_val: 2,
    sketch_type: 'dna',
    source_name: 'NHGRI / NIH — Deoxyribonucleic Acid (DNA) Fact Sheet',
    source_url: 'https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet',
  },

  // ======================= HISTORY (6+) =======================
  {
    slug: 'gobeklitepe-predates-stonehenge-by-6000-years',
    category: 'history',
    title_tr: "Şanlıurfa'daki Göbeklitepe, Stonehenge'den 6.000 Yıl Daha Eski",
    title_en: 'Göbeklitepe in Türkiye Predates Stonehenge by Roughly 6,000 Years',
    summary_tr:
      'MÖ 9600–8200 yıllarına tarihlenen Göbeklitepe, tarımın henüz başlamadığı avcı-toplayıcı çağda dikilmiş T biçimli anıtsal taşlarıyla insanlık tarihini değiştirdi.',
    summary_en:
      'Dating back to 9600–8200 BCE, the monumental T-shaped limestone pillars of Göbeklitepe were carved thousands of years before pottery, metallurgy, or Stonehenge.',
    detail_tr:
      'Bazıları 15 tondan ağır olan kabartmalı sütunlar, insanların önce tapınak ve ortak buluşma alanları inşa etmek için bir araya gelip ardından yerleşik tarıma geçmiş olabileceğini gösteriyor.',
    detail_en:
      'Carved with foxes, wild boars, and cranes on pillars weighing over 15 tons, this UNESCO World Heritage site overturned the theory that settled farming had to precede monumental architecture.',
    question_tr: 'Göbeklitepe günümüzden yaklaşık kaç bin yıl önce inşa edilmeye başlandı?',
    question_en: 'Approximately how many thousand years ago did construction begin at Göbeklitepe?',
    unit_tr: 'bin yıl',
    unit_en: 'k yrs',
    min_val: 4,
    max_val: 20,
    answer_val: 11,
    sketch_type: 'gobeklitepe',
    source_name: 'UNESCO World Heritage Centre — Göbekli Tepe',
    source_url: 'https://whc.unesco.org/en/list/1572/',
  },
  {
    slug: 'kadesh-peace-treaty-oldest-written-accord',
    category: 'history',
    title_tr: 'Kadeş Antlaşması Bilinen En Eski Yazılı Barış Antlaşmasıdır',
    title_en: 'The Kadesh Treaty of 1259 BCE Is History’s Oldest Surviving Peace Accord',
    summary_tr:
      'Hitit Kralı III. Hattuşili ile Mısır Firavunu II. Ramses arasında yapılan bu tarihi antlaşmanın kil tablet kopyası İstanbul Arkeoloji Müzeleri’nde korunur.',
    summary_en:
      'Forged between Hittite King Hattusili III and Pharaoh Ramesses II, this bilingual peace pact survives on clay tablets housed in Istanbul and temple walls in Egypt.',
    detail_tr:
      'Kadeş Savaşı sonrası mühürlenen metin yalnızca ateşkes değil; saldırmazlık, karşılıklı savunma ve siyasi sığınmacıların iadesi gibi modern diplomasi maddelerini MÖ 13. yüzyılda yazılı hale getirmişti.',
    detail_en:
      'Signed around 1259 BCE, the Akkadian cuneiform tablet and Egyptian hieroglyph versions laid out non-aggression clauses, mutual military defense, and extradition rules still echoed in modern treaties.',
    question_tr: 'Hitit-Mısır Kadeş Barış Antlaşması günümüzden yaklaşık kaç yıl önce imzalandı?',
    question_en: 'Roughly how many centuries ago was the Kadesh Peace Treaty signed?',
    unit_tr: 'yüzyıl',
    unit_en: 'centuries',
    min_val: 15,
    max_val: 50,
    answer_val: 33,
    sketch_type: 'treaty',
    source_name: 'United Nations — Treaty of Kadesh Replica',
    source_url: 'https://www.un.org/ungifts/eternal-treaty',
  },
  {
    slug: 'al-karawiyyin-oldest-continual-university',
    category: 'history',
    title_tr: 'Dünyanın Kesintisiz Açık En Eski Üniversitesi 859 Yılında Bir Kadın Tarafından Kuruldu',
    title_en: 'The World’s Oldest Continually Operating University Was Founded in 859 CE',
    summary_tr:
      'Fatıma el-Fihri tarafından Fas’ın Fes kentinde kurulan El-Karaviyyin, UNESCO ve Guinness tarafından kesintisiz eğitim veren en eski yükseköğretim kurumu sayılır.',
    summary_en:
      'Founded in Fez, Morocco in 859 CE by Fatima al-Fihri, the University of al-Qarawiyyin is recognized by UNESCO as the oldest continually operating degree-granting institution.',
    detail_tr:
      'Başlangıçta bir cami ve medrese kompleksi olarak açılan kurum; astronomi, tıp, matematik ve felsefe kürsüleriyle Akdeniz dünyasındaki akademisyenleri bir araya getiren bir kütüphane merkezine dönüştü.',
    detail_en:
      'Endowed with Fatima al-Fihri’s family inheritance, its scholars taught astronomy, medicine, logic, and grammar for more than eleven centuries, preserving thousands of rare medieval manuscripts.',
    question_tr: 'El-Karaviyyin Üniversitesi hangi yüzyılda kurulmuştur?',
    question_en: 'In which century CE was the University of al-Qarawiyyin founded?',
    unit_tr: '. yy',
    unit_en: 'th c.',
    min_val: 5,
    max_val: 16,
    answer_val: 9,
    sketch_type: 'oxford',
    source_name: 'UNESCO World Heritage Centre — Medina of Fez',
    source_url: 'https://whc.unesco.org/en/list/170/',
  },
  {
    slug: 'antikythera-mechanism-ancient-greek-computer',
    category: 'history',
    title_tr: '2.100 Yıllık Antikythera Düzeneği Tutulmaları Hesaplayan Bir Analog Bilgisayardı',
    title_en: 'The 2,100-Year-Old Antikythera Mechanism Was an Ancient Astronomical Computer',
    summary_tr:
      'Ege Denizi’ndeki bir Roma gemi batığından çıkarılan en az 30 bronz dişliden oluşan aygıt, Ay evrelerini ve Olimpiyat tarihlerini hesaplıyordu.',
    summary_en:
      'Recovered from a shipwreck off Greece, this ~2,100-year-old clockwork box used at least 30 precision bronze gears to predict eclipses, lunar phases, and Olympic cycles.',
    detail_tr:
      'X-ışını tomografi taramaları, dişlilerin Ay’ın eliptik yörüngesindeki hız değişimlerini dahi mekanik olarak modelleyen bir diferansiyel dişli düzeneğine sahip olduğunu ortaya çıkardı.',
    detail_en:
      'Modern X-ray tomography revealed an intricate pin-and-slot gear train mimicking Hipparchus’s theory of the Moon’s variable orbital speed—a level of precision unseen again for over a millennium.',
    question_tr: 'Antikythera düzeneğinin günümüze ulaşan parçalarında yaklaşık kaç bronz dişli vardır?',
    question_en: 'At least how many bronze gear wheels survive inside the Antikythera Mechanism?',
    unit_tr: 'dişli',
    unit_en: 'gears',
    min_val: 5,
    max_val: 80,
    answer_val: 30,
    sketch_type: 'compass',
    source_name: 'Britannica — Antikythera Mechanism',
    source_url: 'https://www.britannica.com/topic/Antikythera-mechanism',
  },
  {
    slug: 'vikings-reached-north-america-500-years-before-columbus',
    category: 'history',
    title_tr: "Vikingler Kolomb'dan Yaklaşık 500 Yıl Önce Amerika'ya Ayak Bastı",
    title_en: 'Norse Explorers Reached North America Almost 500 Years Before Columbus',
    summary_tr:
      'Kanada’daki L’Anse aux Meadows kazılarında bulunan ahşap ve demir izleri, İskandinav denizcilerin MS 1021 yılında kıtada yaşadığını kanıtladı.',
    summary_en:
      'Tree-ring radiocarbon evidence at L’Anse aux Meadows in Newfoundland proves Norse sailors felled timber and operated workshops in North America in 1021 CE.',
    detail_tr:
      'MS 993 yılındaki büyük güneş fırtınasının ağaç halkalarında bıraktığı karbon-14 imzasını sayan bilim insanları, Viking yerleşimindeki baltayla kesilmiş ağaçların tam olarak 1021 yılında kesildiğini kesinleştirdi.',
    detail_en:
      'Researchers used a cosmic-ray radiocarbon spike from a 993 CE solar storm preserved inside felled juniper and fir rings to pinpoint Norse woodcutting in Newfoundland to the exact year 1021 CE.',
    question_tr: 'Kanada’daki Viking yerleşiminde kesilen ağaçların yılı MS kaç olarak doğrulandı?',
    question_en: 'In what exact year CE does tree-ring science confirm Vikings cut wood in Canada?',
    unit_tr: 'MS',
    unit_en: 'CE',
    min_val: 800,
    max_val: 1492,
    answer_val: 1021,
    sketch_type: 'viking',
    source_name: 'Nature — Norse Presence in North America in 1021 CE',
    source_url: 'https://www.nature.com/articles/s41586-021-03972-8',
  },
  {
    slug: 'gutenberg-printing-press-sparked-information-explosion',
    category: 'history',
    title_tr: "1440'ta Gutenberg Matbaası Kitap Üretim Maliyetini Yüzde 80'den Fazla Düşürdü",
    title_en: 'Gutenberg’s Movable Metal Type Launched Europe’s 15th-Century Info Boom',
    summary_tr:
      'Metal harf kalıplarını yağ bazlı mürekkeple birleştiren matbaa, yalnızca 50 yıl içinde Avrupa’da yaklaşık 20 milyon kitabın basılmasını sağladı.',
    summary_en:
      'Pairing durable lead-tin-antimony metal type with oil-based ink around 1440 allowed European presses to print roughly 20 million books within fifty years.',
    detail_tr:
      'Öncesinde tek bir İncil’i elle çoğaltmak bir yazmanın bir yıldan uzun süresini alırken, hareketli metal harfler sayesinde aynı metin haftalar içinde yüzlerce kopya olarak bilim insanlarına ulaşabildi.',
    detail_en:
      'Previously, copying one large manuscript by hand took a scribe over a year; reusable metal type multiplied scientific diagrams, star tables, and essays at unprecedented speed across Europe.',
    question_tr: 'Matbaanın icadını izleyen ilk 50 yılda Avrupa’da yaklaşık kaç milyon kitap basıldı?',
    question_en: 'Roughly how many million books were printed in Europe during printing’s first 50 years?',
    unit_tr: 'milyon',
    unit_en: 'million',
    min_val: 1,
    max_val: 50,
    answer_val: 20,
    sketch_type: 'printing',
    source_name: 'Library of Congress — The Gutenberg Bible',
    source_url: 'https://www.loc.gov/exhibits/bibles/the-gutenberg-bible.html',
  },

  // ======================= SCIENCE (6+) =======================
  {
    slug: 'lightning-bolt-heats-air-five-times-sun-surface',
    category: 'science',
    title_tr: "Bir Şimşek Çevresindeki Havayı Güneş Yüzeyinden 5 Kat Sıcak Yapar",
    title_en: 'A Single Bolt of Lightning Heats Surrounding Air Five Times Hotter Than the Sun',
    summary_tr:
      'Saniyenin binde birinde 30.000 °C sıcaklığa fırlayan hava aniden genleşerek gök gürültüsü dediğimiz ses şok dalgasını oluşturur.',
    summary_en:
      'Flash-heating the air channel to roughly 30,000 °C in microseconds causes explosive thermal expansion, generating the supersonic shockwave we hear as thunder.',
    detail_tr:
      'Güneş’in görünen yüzeyi (fotosfer) yaklaşık 5.500 °C civarındayken, yüz milyonlarca voltluk bulut-yer boşalması havayı anlık olarak plazmaya dönüştürüp beş kat daha yüksek sıcaklığa çıkarır.',
    detail_en:
      'While the Sun’s photosphere glows near 5,500 °C, a lightning channel carries tens of thousands of amperes through thin air, superheating molecules into a luminous plasma column reaching ~30,000 °C.',
    question_tr: 'Bir şimşek kanalı çevresindeki havayı yaklaşık kaç bin °C sıcaklığa çıkarır?',
    question_en: 'Roughly how many thousand °C does a lightning bolt heat the surrounding air?',
    unit_tr: 'bin °C',
    unit_en: 'k °C',
    min_val: 5,
    max_val: 60,
    answer_val: 30,
    sketch_type: 'lightning',
    source_name: 'NOAA National Weather Service — Lightning Science',
    source_url: 'https://www.weather.gov/safety/lightning-science-overview',
  },
  {
    slug: 'liquid-helium-becomes-frictionless-superfluid',
    category: 'science',
    title_tr: 'Mutlak Sıfıra Yaklaşan Helyum Sürtünmesiz Süper Akışkana Dönüşüyor',
    title_en: 'Cooled Near Absolute Zero, Liquid Helium Climbs Walls as a Frictionless Superfluid',
    summary_tr:
      '-271 °C’nin (2,17 Kelvin) altına soğutulan helyum-4 tüm viskozitesini kaybederek kendi kendine bardağın duvarından tırmanıp dışarı akabilir.',
    summary_en:
      'Below 2.17 Kelvin (-271 °C), helium-4 enters a macroscopic quantum state with zero viscosity—capable of creeping straight up beaker walls and leaking through microscopic pores.',
    detail_tr:
      'Bu sıcaklıkta milyonlarca helyum atomu tek bir kuantum dalga fonksiyonu gibi uyumlu hareket etmeye başlar (Bose–Einstein yoğunlaşması benzeri etki); mekanik sürtünme sıfırlandığı için oluşan girdaplar hiç yavaşlamadan döner.',
    detail_en:
      'Below the lambda point, quantum statistics cause helium atoms to condense into a coherent fluid with zero internal friction, allowing superfluid films to defy gravity and coat every connected surface.',
    question_tr: 'Helyum-4 gazı kaç Kelvin sıcaklığın altında süper akışkan özelliğe geçer?',
    question_en: 'Below roughly how many Kelvin does liquid helium-4 become a superfluid?',
    unit_tr: 'K',
    unit_en: 'K',
    min_val: 1,
    max_val: 20,
    answer_val: 2,
    sketch_type: 'superfluid',
    source_name: 'Nobel Prize — Discovery of Superfluidity',
    source_url: 'https://www.nobelprize.org/prizes/physics/1978/kapitsa/facts/',
  },
  {
    slug: 'quantum-entanglement-instant-state-correlation',
    category: 'science',
    title_tr: 'Kuantum Dolanıklıkta İki Parçacık Kilometrelerce Uzakta Bile Eşleşir',
    title_en: 'Quantum Entanglement Links Particles Across Hundreds of Kilometers Instantly',
    summary_tr:
      'Birbirine dolanık iki foton uzaya gönderilse bile birinin ölçülmesi diğerinin kuantum durumunu anında belirler; ancak bu yolla ışıktan hızlı mesaj gönderilemez.',
    summary_en:
      'Two entangled photons share a single linked quantum state even across satellite distances—measuring one’s polarization immediately reveals the other’s, without transmitting faster-than-light messages.',
    detail_tr:
      'Çin’in Micius uydusu dolanık foton çiftlerini yer istasyonlarına 1.200 km mesafeden başarıyla dağıtarak Bell eşitsizliği testlerini uzay ölçeğinde doğruladı; bu teknoloji kırılması imkansız kuantum şifrelemenin temelidir.',
    detail_en:
      'Experiments including the 1,200-km Micius satellite link verified Bell-test correlations at orbital scale, proving Einstein’s local hidden-variable skepticism wrong and enabling quantum-encrypted communications.',
    question_tr: 'Micius uydusu dolanık fotonları yerdeki istasyonlara yaklaşık kaç km mesafeden dağıttı?',
    question_en: 'Roughly how many kilometers apart did the Micius satellite test entangled photons?',
    unit_tr: 'km',
    unit_en: 'km',
    min_val: 100,
    max_val: 3000,
    answer_val: 1200,
    sketch_type: 'entanglement',
    source_name: 'Science — Satellite-Based Entanglement Distribution',
    source_url: 'https://www.science.org/doi/10.1126/science.aan3211',
  },
  {
    slug: 'one-gram-of-dna-can-store-petabytes-of-data',
    category: 'science',
    title_tr: 'Bir Gram DNA Molekülü Yaklaşık 215 Milyon Gigabyte Veri Depolayabilir',
    title_en: 'A Single Gram of DNA Can Theoretically Store 215 Million Gigabytes of Data',
    summary_tr:
      'İkili bilgisayar kodlarını (0 ve 1) A, T, C, G nükleotid dizilerine çeviren bilim insanları filmleri ve arşivleri mikroskobik DNA damlalarına yazıyor.',
    summary_en:
      'By encoding binary 0s and 1s into synthetic A, C, G, and T DNA bases, a single gram of nucleic acid can theoretically store ~215 petabytes for millennia without power.',
    detail_tr:
      'Silikon sabit diskler 10–30 yılda bozulurken kuru ve serin ortamdaki DNA binlerce yıl okunabilir kalır; araştırmacılar 2017 yılında bir bilgisayar işletim sistemini ve kısa bir filmi başarılı biçimde DNA sentezine yazıp geri okudu.',
    detail_en:
      'Unlike magnetic hard drives that degrade within decades, cool dry DNA preserves data for thousands of years. Researchers have already encoded an operating system, books, and video into DNA strands and decoded them error-free.',
    question_tr: 'DNA veri kodlamasında bilgiyi saklayan kaç çeşit temel nükleotid harfi (A,T,C,G) vardır?',
    question_en: 'How many distinct DNA base letters (A, C, G, T) are used to encode digital data?',
    unit_tr: 'baz',
    unit_en: 'bases',
    min_val: 2,
    max_val: 12,
    answer_val: 4,
    sketch_type: 'protein',
    source_name: 'Science / Columbia — DNA Fountain Data Storage',
    source_url: 'https://www.science.org/doi/10.1126/science.aaj2038',
  },
  {
    slug: 'atoms-are-99-9999999-percent-empty-space',
    category: 'science',
    title_tr: 'Bütün Maddeyi Oluşturan Atomların %99,9999999’u Boşluktur',
    title_en: 'Atoms Are 99.9999999% Empty Space—Yet Electrostatic Fields Make Them Solid',
    summary_tr:
      'Bir atom stadyum büyüklüğünde olsaydı çekirdeği ortadaki bir bezelye kadar kalırdı; elinizin masadan geçmemesini sağlayan şey elektron itmesidir.',
    summary_en:
      'If an atom’s outer electron cloud were scaled up to a football stadium, the dense atomic nucleus at center would be smaller than a marble.',
    detail_tr:
      'Çekirdek neredeyse tüm kütleyi taşımakla birlikte hacmin milyarda birinden azını kaplar; dokunduğumuzda hissettiğimiz sertlik ise atomlardaki dış elektron bulutlarının Pauli dışlama ilkesiyle birbirini itmesidir.',
    detail_en:
      'Even though atomic nuclei contain over 99.9% of ordinary matter’s mass in tiny space, electrostatic repulsion and the Pauli exclusion principle prevent electron clouds from overlapping when you touch solid objects.',
    question_tr: 'Sıradan bir atomun kütlesinin yüzde kaçından fazlası merkez çekirdekte toplanmıştır?',
    question_en: 'Over what percentage of an atom’s total mass is concentrated inside its tiny nucleus?',
    unit_tr: '%',
    unit_en: '%',
    min_val: 50,
    max_val: 100,
    answer_val: 99,
    sketch_type: 'atom',
    source_name: 'CERN — Matter & Atomic Structure',
    source_url: 'https://home.cern/science/physics/standard-model',
  },
  {
    slug: 'magic-angle-twisted-bilayer-graphene-superconductor',
    category: 'science',
    title_tr: 'İki Karbon Tabakası Tam 1,1° Döndürüldüğünde Dirençsiz Süperiletken Olur',
    title_en: 'Twisting Two Sheets of Graphene by Exactly 1.1° Turns Carbon Into a Superconductor',
    summary_tr:
      'Normalde tek atom kalınlığındaki grafen iyi bir iletkendir; ancak iki katman üst üste konup 1,1 derecelik sihirli açıyla döndürüldüğünde elektronlar sıfır dirençle akmaya başlar.',
    summary_en:
      'Stack two atom-thin sheets of carbon and rotate them by a magic angle of 1.1 degrees, and electrons suddenly lock into synchronized zero-resistance superconductivity.',
    detail_tr:
      'MIT araştırmacıları 2018’de bu küçük açı kaymasının yarattığı Moiré deseninin elektronları neredeyse durma noktasına getirdiğini ve kuantum etkileşimiyle direnci tamamen sıfırladığını kanıtladı.',
    detail_en:
      'MIT physicists discovered that a 1.1-degree twist forms an atomic Moiré superlattice that slows conduction electrons to a crawl, letting quantum interactions pair them into a frictionless supercurrent.',
    question_tr: 'İki grafen katmanını süperiletkenliğe geçiren "sihirli bükülme açısı" yaklaşık kaç derecedir?',
    question_en: 'Roughly what twist angle turns two stacked graphene layers into a superconductor?',
    unit_tr: '°',
    unit_en: '°',
    min_val: 0,
    max_val: 10,
    answer_val: 1.1,
    sketch_type: 'atom',
    source_name: 'Nature — Unconventional Superconductivity in Magic-Angle Graphene Superlattices',
    source_url: 'https://www.nature.com/articles/nature26160',
  },

  // ======================= WEIRD & RECORDS (6+) =======================
  {
    slug: 'antarctica-largest-desert-on-earth',
    category: 'records',
    title_tr: 'Dünyanın En Büyük Çölü Sahra Değil, Buzlarla Kaplı Antarktika’dır',
    title_en: 'The Largest Desert on Earth Isn’t the Sahara—It’s Freezing Antarctica',
    summary_tr:
      'Bir bölgenin çöl sayılması sıcaklığa değil yıllık yağışa bağlıdır; 14 milyon km²’lik Antarktika yıllık 200 mm altında yağışla gezegenin en büyük çölüdür.',
    summary_en:
      'Deserts are defined by scarce precipitation, not scorching heat. Covering 14.2 million km² with under 200 mm of annual moisture, Antarctica is Earth’s largest desert.',
    detail_tr:
      'Aşırı soğuk hava nemi neredeyse hiç tutamadığı için kıtanın iç kesimleri Sahra’dan bile kurudur; "Kuru Vadiler" adı verilen bazı Antarktika vadilerine milyonlarca yıldır neredeyse hiç yağmur yağmamıştır.',
    detail_en:
      'Frigid air holds minimal water vapor, making Antarctica’s interior drier than the Sahara. Parts of the McMurdo Dry Valleys have seen virtually no rain for nearly two million years.',
    question_tr: 'Antarktika kıtası yaklaşık kaç milyon kilometrekarelik yüzölçümüne sahiptir?',
    question_en: 'Approximately how many million square kilometers does Antarctica cover?',
    unit_tr: 'milyon km²',
    unit_en: 'M km²',
    min_val: 3,
    max_val: 30,
    answer_val: 14,
    sketch_type: 'antarctica',
    source_name: 'USGS / British Antarctic Survey — Antarctica Facts',
    source_url: 'https://www.bas.ac.uk/about/antarctica/',
  },
  {
    slug: 'deck-of-cards-combinations-exceed-earth-atoms',
    category: 'records',
    title_tr: '52 Kartlık Bir Desteyi Karıştırma Olasılığı Dünyadaki Atomlardan Fazladır',
    title_en: 'Shuffling a 52-Card Deck Beats the Number of Atoms Making Up Earth',
    summary_tr:
      '52 faktöriyel (52!) yaklaşık 8×10^67 farklı sıralama demektir; bu sayı kadar benzersiz dizilim evrendeki çoğu sayımla kıyaslanamayacak kadar büyüktür.',
    summary_en:
      'There are 52! (roughly 8 × 10^67) possible orderings of a standard 52-card deck—vastly more combinations than all the atoms forming planet Earth.',
    detail_tr:
      'Bir desteyi her saniye rastgele karıştırsanız ve Büyük Patlama’dan bu yana geçen 13,8 milyar yıl boyunca durmadan devam etseniz bile olası tüm dizilimlerin milyarda birine bile yaklaşamazsınız.',
    detail_en:
      'Every time you thoroughly shuffle a 52-card deck, it is statistically near-certain that specific sequence of cards has never existed in human history before.',
    question_tr: 'Standart bir iskambil destesi tam olarak kaç karttan oluşur?',
    question_en: 'Exactly how many cards make up a standard deck creating 8×10^67 orderings?',
    unit_tr: 'kart',
    unit_en: 'cards',
    min_val: 24,
    max_val: 100,
    answer_val: 52,
    sketch_type: 'cards',
    source_name: 'Dartmouth Mathematics — Factorials & Card Shuffling',
    source_url: 'https://math.dartmouth.edu/~chance/teaching_aids/books_articles/probability_book/Chapter1.pdf',
  },
  {
    slug: 'krakatoa-1883-loudest-recorded-sound-earth',
    category: 'records',
    title_tr: "1883 Krakatoa Patlaması Dünya'yı Dört Kez Dolaşan Ses Dalgası Üretti",
    title_en: 'The 1883 Krakatoa Eruption Sent a Pressure Wave Around Earth Four Times',
    summary_tr:
      'Tarihte kaydedilen en gürültülü olay olan volkan patlaması yaklaşık 310 desibele ulaştı ve 4.800 km ötedeki adalardan bile top ateşi gibi duyuldu.',
    summary_en:
      'Estimated near 310 decibels, the 1883 eruption of Krakatoa was heard 4,800 km away in Rodrigues Island and circled Earth’s barometers seven times in opposing waves.',
    detail_tr:
      'Endonezya’daki patlamanın şok dalgası 160 km uzaktaki denizcilerin kulak zarlarını yırttı; modern hava basıncı kayıtları ses dalgasının gezegeni defalarca dolaştığını beş gün boyunca izledi.',
    detail_en:
      'Sailors 64 km away suffered ruptured eardrums, while barometers worldwide logged the atmospheric pressure wave traversing the globe four times in one direction and three in reverse.',
    question_tr: 'Krakatoa patlamasının sesi yaklaşık kaç kilometre öteden bile işitildi?',
    question_en: 'Up to roughly how many kilometers away was the 1883 Krakatoa blast heard?',
    unit_tr: 'km',
    unit_en: 'km',
    min_val: 500,
    max_val: 10000,
    answer_val: 4800,
    sketch_type: 'decibel',
    source_name: 'NOAA — Krakatoa 1883 Eruption Acoustic Wave',
    source_url: 'https://www.ncei.noaa.gov/news/day-krakatoa-erupted',
  },
  {
    slug: 'lego-world-largest-tire-manufacturer-volume',
    category: 'records',
    title_tr: 'Dünyanın Adet Bazında En Büyük Lastik Üreticisi Lego Şirketidir',
    title_en: 'The World’s Largest Tire Manufacturer by Unit Count Is Toymaker LEGO',
    summary_tr:
      'Guinness Dünya Rekorları’na göre Danimarkalı oyuncak şirketi yılda 300 milyondan fazla minyatür lastik üreterek tüm otomotiv devlerini adet olarak geçer.',
    summary_en:
      'Guinness World Records certifies LEGO as the planet’s #1 tire producer by quantity, molding over 300 million tiny rubber wheels each year—more than Bridgestone or Michelin.',
    detail_tr:
      '1962’de ilk minyatür tekerleğini çıkaran marka her yıl yüz milyonlarca setle birlikte milyarlarca parça üretiyor; elbette ağırlık olarak dev otomotiv markaları önde olsa da sayısal rekor oyuncak sektöründe.',
    detail_en:
      'Since introducing its first miniature rubber wheel in 1962, LEGO factories cast more than 800,000 tiny tires every single day for Technic, City, and Creator sets.',
    question_tr: 'Lego yılda yaklaşık kaç milyon adet minyatür kauçuk lastik üretmektedir?',
    question_en: 'Roughly how many million rubber tires does LEGO produce every year?',
    unit_tr: 'milyon',
    unit_en: 'million',
    min_val: 50,
    max_val: 800,
    answer_val: 300,
    sketch_type: 'cube',
    source_name: 'Guinness World Records — Largest Tyre Manufacturer',
    source_url: 'https://www.guinnessworldrecords.com/world-records/100908-largest-tyre-manufacturer-by-number-produced',
  },
  {
    slug: 'chess-games-exceed-shannon-number-atoms',
    category: 'records',
    title_tr: 'Oynanabilecek Olası Satranç Maçlarının Sayısı Evrendeki Atomları Aşar',
    title_en: 'Possible Unique Chess Games Outnumber Atoms in the Observable Universe',
    summary_tr:
      'Bilgi kuramının kurucusu Claude Shannon’ın hesabına göre 40 hamlelik bir oyunda 10^120 farklı satranç varyasyonu mümkündür.',
    summary_en:
      'Mathematician Claude Shannon calculated at least 10^120 legal chess game variations—dwarfing the estimated 10^80 atoms in the observable universe.',
    detail_tr:
      'Her hamlede ortalama 30-35 geçerli hamle seçeneği bulunduğu için daha dördüncü hamlede bile iki taraf arasında 318 milyardan fazla olası tahta pozisyonu doğar.',
    detail_en:
      'Because each turn averages ~30–35 legal moves, just four moves apiece by White and Black already yield more than 318 billion distinct board combinations.',
    question_tr: 'Satrançta iki tarafın ilk 4 hamlesi sonunda kaç milyar farklı tahta pozisyonu oluşabilir?',
    question_en: 'How many billion chess positions can exist after just 4 moves by each side?',
    unit_tr: 'milyar',
    unit_en: 'billion',
    min_val: 10,
    max_val: 600,
    answer_val: 318,
    sketch_type: 'chess',
    source_name: 'Shannon (1950) / Britannica — Chess Combinatorics',
    source_url: 'https://www.britannica.com/topic/chess',
  },
  {
    slug: 'challenger-deep-deeper-than-everest-flipped',
    category: 'records',
    title_tr: 'Mariana Çukuru Everest Dağı’nı Ters Çevirseniz Bile Üstünde 2 km Su Bırakır',
    title_en: 'Challenger Deep Would Submerge Mount Everest With 2 km of Water to Spare',
    summary_tr:
      'Pasifik Okyanusu’ndaki Challenger Çukuru yaklaşık 10.935 metre derinliğiyle gezegenin bilinen en derin okyanus tabanı noktasıdır.',
    summary_en:
      'Reaching roughly 10,935 meters below sea level in the Mariana Trench, Challenger Deep is Earth’s deepest surveyed ocean point under crushing 1,000-atmosphere pressure.',
    detail_tr:
      'Bu derinlikte her santimetrekareye yaklaşık bir tonu aşkın hidrostatik basınç biner; buna rağmen özel kabuklu amfipodlar ve salyangoz balıkları bu karanlık ekosistemde yaşayabilmektedir.',
    detail_en:
      'At the trench floor, water pressure exceeds 1,080 atmospheres—equivalent to more than 50 jumbo jets pressing on a person—yet specialized hadal snailfish and amphipods thrive there.',
    question_tr: 'Mariana Çukuru’ndaki Challenger Çukuru yaklaşık kaç metre derinliğindedir?',
    question_en: 'Approximately how deep is Challenger Deep in the Mariana Trench (in meters)?',
    unit_tr: 'm',
    unit_en: 'm',
    min_val: 6000,
    max_val: 15000,
    answer_val: 10935,
    sketch_type: 'shark',
    source_name: 'NOAA Ocean Exploration — Mariana Trench',
    source_url: 'https://oceanexplorer.noaa.gov/facts/mariana-trench.html',
  },
];

// Deterministic verified parametric scientific library for unlimited future runs
const PARAMETRIC_VERIFIED_TEMPLATES = {
  space: [
    {
      topic: 'pluto-orbital-period',
      title_tr: "Plüton'un Güneş Etrafındaki Bir Yılı Tam 248 Dünya Yılı Sürer",
      title_en: 'One Single Year on Pluto Takes 248 Full Earth Years',
      summary_tr:
        "1930'da keşfedilen cüce gezegen Plüton henüz Güneş çevresindeki ilk tam turunu tamamlayamamıştır; bu tur ancak 2178 yılında bitecektir.",
      summary_en:
        'Discovered in 1930, Pluto orbits so slowly 5.9 billion km out that it will not finish even one full lap around the Sun since discovery until the year 2178.',
      detail_tr:
        "Kepler'in üçüncü yasasına göre Güneş’ten uzaklaştıkça yörünge hızı keskin biçimde düşer; Plüton’un ortalama yörünge hızı Dünya’nın saniyede 30 km’lik hızına kıyasla sadece 4,7 km/sn’dir.",
      detail_en:
        'Following Kepler’s third law, distant outer-system bodies move slowly along vast elliptical paths; Pluto cruises at just 4.7 km/s compared to Earth’s 30 km/s orbital speed.',
      question_tr: "Plüton'un Güneş etrafında 1 tam turu kaç Dünya yılı sürer?",
      question_en: 'How many Earth years does it take Pluto to complete one orbit?',
      unit_tr: 'yıl',
      unit_en: 'years',
      min_val: 50,
      max_val: 400,
      answer_val: 248,
      sketch_type: 'orbit',
      source_name: 'NASA Science — Pluto Facts',
      source_url: 'https://science.nasa.gov/dwarf-planets/pluto/',
    },
    {
      topic: 'venus-surface-temperature-lead-melting',
      title_tr: "Venüs Yüzeyindeki 465 °C Sıcaklık Kurşunu Anında Eritebilir",
      title_en: 'Venus Stays Around 465 °C—Hot Enough to Melt Lead on Its Surface',
      summary_tr:
        "Güneş'e Merkür'den daha uzak olmasına rağmen yoğun karbondioksit atmosferi Venüs'ü Güneş Sistemi'nin en sıcak gezegeni yapar.",
      summary_en:
        'Despite orbiting farther from the Sun than Mercury, Venus traps heat beneath a crushing 92-bar carbon dioxide greenhouse blanket reaching roughly 465 °C day and night.',
      detail_tr:
        'Yüzey basıncı okyanusun 900 metre altındaki basınca eşittir ve yoğun sülfürik asit bulutları gelen ısının neredeyse tamamını içeride hapsederek kontrolden çıkmış sera etkisi yaratır.',
      detail_en:
        'At 92 atmospheres of surface pressure—equal to diving 900 meters underwater on Earth—thick CO₂ and sulfuric-acid clouds lock in thermal radiation uniformly around the planet.',
      question_tr: 'Venüs yüzeyinin ortalama sıcaklığı yaklaşık kaç °C düzeyindedir?',
      question_en: 'What is the average surface temperature on Venus in °C?',
      unit_tr: '°C',
      unit_en: '°C',
      min_val: 150,
      max_val: 700,
      answer_val: 465,
      sketch_type: 'mars',
      source_name: 'NASA Science — Venus Overview',
      source_url: 'https://science.nasa.gov/venus/',
    },
  ],
  nature: [
    {
      topic: 'peregrine-falcon-dive-speed',
      title_tr: 'Aladoğan Kuşu Dalış Sırasında Saatte 389 km Hıza Ulaşabilir',
      title_en: 'The Peregrine Falcon Dives Through the Sky at Over 380 km/h',
      summary_tr:
        'Gezegenin en hızlı hayvanı olan aladoğan, yüksek irtifadan avına pike yaptığında Formula 1 araçlarından bile yüksek hıza erişir.',
      summary_en:
        'Earth’s fastest living creature folds its wings into a teardrop profile during hunting stoops, slicing downward faster than a Formula 1 race car.',
      detail_tr:
        'Burun deliklerindeki özel kemiksi koniler aşırı yüksek hava basıncını kırarak kuşun bu hızda rahatça nefes almasını ve akciğerlerinin patlamamasını sağlar.',
      detail_en:
        'Small bony tubercles inside a falcon’s nostrils act like jet-engine baffles, slowing incoming airflow so the bird can breathe safely while plummeting above 380 km/h.',
      question_tr: 'Aladoğan kuşunun kaydedilen en yüksek dalış hızı yaklaşık kaç km/sa düzeyindedir?',
      question_en: 'Roughly what top diving speed in km/h can a peregrine falcon reach?',
      unit_tr: 'km/sa',
      unit_en: 'km/h',
      min_val: 120,
      max_val: 500,
      answer_val: 389,
      sketch_type: 'flamingo',
      source_name: 'National Geographic / Cornell Lab — Peregrine Falcon',
      source_url: 'https://www.allaboutbirds.org/guide/Peregrine_Falcon/overview',
    },
    {
      topic: 'hummingbird-heart-rate-1200-bpm',
      title_tr: 'Sinek Kuşunun Kalbi Uçarken Dakikada 1.200 Kezden Fazla Atar',
      title_en: 'A Hovering Hummingbird’s Heart Beats Over 1,200 Times Per Minute',
      summary_tr:
        'Saniyede yaklaşık 50–80 kez kanat çırpan bu minik kuşlar gece enerji tasarrufu yapmak için vücut ısısını düşürüp torpor uykusuna geçer.',
      summary_en:
        'Beating their wings up to 80 times a second to hover in place, hummingbirds run an extreme metabolism—over 1,200 heartbeats per minute in flight.',
      detail_tr:
        'Geceleri donma riskini önlemek için kalp atışlarını dakikada 50’nin altına indirip derin "torpor" haline geçerek ertesi sabaha kadar enerjilerinin %60’ından fazlasını korurlar.',
      detail_en:
        'At night, hummingbirds enter an energy-saving torpor state where heart rates plunge below 50 bpm so they do not starve before dawn.',
      question_tr: 'Uçuş halindeki bir sinek kuşunun kalbi dakikada yaklaşık kaç kez atabilir?',
      question_en: 'About how many beats per minute can a flying hummingbird’s heart reach?',
      unit_tr: 'atım/dk',
      unit_en: 'bpm',
      min_val: 200,
      max_val: 1800,
      answer_val: 1200,
      sketch_type: 'honeybee',
      source_name: 'Smithsonian National Zoo — Hummingbirds',
      source_url: 'https://nationalzoo.si.edu/migratory-birds/hummingbirds',
    },
  ],
  human_body: [
    {
      topic: 'stomach-lining-renews-every-few-days',
      title_tr: 'Midenizin İç Yüzeyi Kendi Asidinden Korunmak İçin 4 Günde Bir Yenilenir',
      title_en: 'Your Stomach Lining Completely Replaces Its Surface Cells Roughly Every 4 Days',
      summary_tr:
        'Hidroklorik asit yiyecekleri parçalarken koruyucu mukus bariyeri ve hızlı hücre yenilenmesi midenin kendi kendini sindirmesini önler.',
      summary_en:
        'Exposed constantly to corrosive pH ~1.5 hydrochloric acid, stomach epithelial surface cells divide rapidly to rebuild a fresh protective barrier every ~3–5 days.',
      detail_tr:
        'Bikarbonat bakımından zengin kalın mukus tabakası asit iyonlarını yüzeye ulaşmadan nötralize eder; alttaki kök hücreler ise aşınan hücreleri birkaç gün içinde yenisiyle değiştirir.',
      detail_en:
        'Thick bicarbonate-rich mucus neutralizes gastric acid right at the cell surface while crypt stem cells continually push fresh surface cells upward.',
      question_tr: 'İnsan mide zarının yüzey hücreleri ortalama kaç günde bir tamamen yenilenir?',
      question_en: 'Roughly how many days does it take for stomach surface lining cells to renew?',
      unit_tr: 'gün',
      unit_en: 'days',
      min_val: 1,
      max_val: 30,
      answer_val: 4,
      sketch_type: 'stomach',
      source_name: 'NIH / NIDDK — Your Digestive System',
      source_url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works',
    },
    {
      topic: 'human-femur-stronger-than-concrete',
      title_tr: 'Uyluk Kemiğiniz (Femur) Aynı Kalınlıktaki Çelik ve Betona Meydan Okur',
      title_en: 'Your Femur Bone Can Withstand Nearly 4,000 Newtons of Compressive Force',
      summary_tr:
        'Kalsiyum mineralleriyle örülü bal peteği süngerimsi yapısı sayesinde femur kemiği basınç altında betonarmeden bile yüksek dayanım gösterir.',
      summary_en:
        'Reinforced with mineral hydroxyapatite crystals and collagen fibers, the human thigh bone resists heavier compressive loads per unit weight than reinforced concrete.',
      detail_tr:
        'Kemiğin içindeki gözenekli "trabeküler" mimari yürürken veya zıplarken gelen darbeleri tıpkı köprü kemerleri gibi yönlendirerek ağırlığı hafifletirken kırılma direncini zirvede tutar.',
      detail_en:
        'Inside the bone, crisscrossing trabecular struts align precisely along stress lines like suspension-bridge cables, giving maximum strength at minimum weight.',
      question_tr: 'İnsan vücudundaki en uzun ve en güçlü kemik yetişkin boyunun yaklaşık yüzde kaçıdır?',
      question_en: 'Roughly what percentage of an adult human’s height does the femur make up?',
      unit_tr: '%',
      unit_en: '%',
      min_val: 10,
      max_val: 50,
      answer_val: 26,
      sketch_type: 'bones',
      source_name: 'NIAMS / NIH — Healthy Bones Matter',
      source_url: 'https://www.niams.nih.gov/health-topics/bone-health',
    },
  ],
  history: [
    {
      topic: 'pompeii-eruption-year-79-ce',
      title_tr: 'Vezüv Yanardağı MS 79 Yılında Pompeii Kentini Saatler İçinde Müze Haline Getirdi',
      title_en: 'Mount Vesuvius Preserved Roman Pompeii Under Meters of Ash in 79 CE',
      summary_tr:
        'Yaklaşık 4 ila 6 metre volkanik kül tabakası, Antik Roma’daki ekmek fırınlarından duvar grafitilerine kadar günlük hayatı olduğu gibi dondurdu.',
      summary_en:
        'When Mount Vesuvius erupted in 79 CE, roughly 4–6 meters of pumice and ash sealed Roman bakeries, frescoes, and street graffiti intact for archaeologists.',
      detail_tr:
        'Kül tabakasının bıraktığı boşluklara 19. yüzyılda alçı dökülmesiyle yalnızca binalar değil, Antik Roma vatandaşlarının giysileri ve son anları bile üç boyutlu belgelendi.',
      detail_en:
        'Airless ash layers created natural molds around organic materials, letting archaeologists reconstruct everyday wooden furniture, carbonized bread loaves, and fresco colors.',
      question_tr: 'Vezüv Yanardağı’nın Pompeii’yi küller altında bıraktığı yıl MS kaçtır?',
      question_en: 'In what exact year CE did Mount Vesuvius bury Pompeii?',
      unit_tr: 'MS',
      unit_en: 'CE',
      min_val: 1,
      max_val: 500,
      answer_val: 79,
      sketch_type: 'hourglass',
      source_name: 'UNESCO World Heritage — Pompeii & Herculaneum',
      source_url: 'https://whc.unesco.org/en/list/829/',
    },
    {
      topic: 'great-wall-total-length-21196-km',
      title_tr: 'Çin Seddi Tüm Kolları ve Kalıntılarıyla 21.196 Kilometre Uzunluğundadır',
      title_en: 'China’s Great Wall Network Stretches Over 21,196 Kilometers Across Dynasties',
      summary_tr:
        'Farklı hanedanlar boyunca 2.000 yılı aşkın sürede örülen savunma duvarları, hendekler ve gözetleme kuleleri yarı Dünya çevresine yaklaşır.',
      summary_en:
        'Built and linked by multiple Chinese dynasties over two millennia, every mapped wall section, trench, and watchtower spans an astonishing 21,196 km total.',
      detail_tr:
        'Tek bir kesintisiz duvardan ziyade coğrafyaya uyum sağlayan duvarlar ve doğal dağ geçitlerinden oluşan sistemde taş bloklar arasındaki harca yapışkan pirinç unu katılmıştır.',
      detail_en:
        'Rather than one unbroken stone ribbon, engineers blended mountain ridges, rammed earth, and brick sections bound together with sticky rice-flour mortar for extra durability.',
      question_tr: 'Çin Seddi’nin belgelenen toplam uzunluğu yaklaşık kaç bin kilometredir?',
      question_en: 'Roughly how many thousand kilometers long is the entire Great Wall survey?',
      unit_tr: 'bin km',
      unit_en: 'k km',
      min_val: 4,
      max_val: 40,
      answer_val: 21,
      sketch_type: 'timeline',
      source_name: 'UNESCO World Heritage — The Great Wall',
      source_url: 'https://whc.unesco.org/en/list/438/',
    },
  ],
  science: [
    {
      topic: 'glass-prism-splits-white-light-spectrum',
      title_tr: 'Gökkuşağı ve Prizma Işığı Dalga Boyuna Göre Farklı Açılarla Kırar',
      title_en: 'Water Droplets Split White Sunlight Because Blue Light Bends Sharper Than Red',
      summary_tr:
        'Kısa dalga boylu mor-mavi ışık camda ve suda kırmızıdan daha fazla yavaşlayıp büküldüğü için beyaz güneş ışığı renk tayfına ayrılır.',
      summary_en:
        'Shorter violet-blue wavelengths slow down more in water or glass than longer red wavelengths, dispersing white light into a clean rainbow spectrum.',
      detail_tr:
        'Isaac Newton 1666’da prizma deneyleriyle renklerin cam tarafından uydurulmadığını, beyaz ışığın zaten tüm renk spektrumunun birleşimi olduğunu ikinci bir ters prizmayla kanıtladı.',
      detail_en:
        'In 1666, Isaac Newton used a second inverted prism to recombine dispersed spectrum colors back into pure white light—proving color lives inside light waves, not inside glass.',
      question_tr: 'Newton’un klasik prizma renk spektrumu kaç ana renkten oluşur?',
      question_en: 'How many classic rainbow bands did Newton’s prism spectrum famously divide white light into?',
      unit_tr: 'renk',
      unit_en: 'colors',
      min_val: 3,
      max_val: 12,
      answer_val: 7,
      sketch_type: 'photon',
      source_name: 'Royal Society — Newton’s Optics Papers',
      source_url: 'https://royalsociety.org/about-us/history/',
    },
    {
      topic: 'boiling-point-drops-on-mount-everest',
      title_tr: "Everest'in Zirvesinde Su 100 °C Yerine Yaklaşık 68 °C'de Kaynar",
      title_en: 'At Mount Everest’s Summit, Pure Water Boils Around 68 °C Instead of 100 °C',
      summary_tr:
        '8.849 metre yükseklikte hava basıncı deniz seviyesinin üçte birine düştüğü için su molekülleri çok daha düşük sıcaklıkta buhara kaçar.',
      summary_en:
        'At 8,849 meters altitude, atmospheric pressure drops to roughly a third of sea-level pressure, allowing water vapor bubbles to break free around 68 °C.',
      detail_tr:
        'Bu yüzden yüksek dağlarda çay demlemek veya makarna haşlamak çok zordur; kaynayan su elinizi yakacak kadar bile yüksek enerjiye çıkmadığı için nişasta tam pişmez.',
      detail_en:
        'Because water cannot exceed its boiling temperature in an open pot, high-altitude climbers struggle to cook pasta or hard-boil eggs unless they carry sealed pressure cookers.',
      question_tr: 'Everest Dağı zirvesinde saf su yaklaşık kaç °C sıcaklıkta kaynar?',
      question_en: 'Roughly at what °C temperature does pure water boil atop Mount Everest?',
      unit_tr: '°C',
      unit_en: '°C',
      min_val: 40,
      max_val: 100,
      answer_val: 68,
      sketch_type: 'triple_point',
      source_name: 'USGS — Water Boiling Points & Altitude',
      source_url: 'https://www.usgs.gov/special-topics/water-science-school/science/water-qa-why-does-water-boil-faster-high-altitude',
    },
  ],
  records: [
    {
      topic: 'shortest-commercial-flight-westray-papa-westray',
      title_tr: 'Dünyanın En Kısa Tarifeli Uçak Seferi Yalnızca 53–90 Saniye Sürer',
      title_en: 'The World’s Shortest Scheduled Commercial Flight Lasts Roughly 90 Seconds',
      summary_tr:
        'İskoçya’nın Orkney Adaları’ndaki Westray ve Papa Westray adaları arasındaki 2,7 km’lik uçuş rüzgara göre bir buçuk dakikadan kısa sürede tamamlanır.',
      summary_en:
        'Connecting Westray and Papa Westray across 2.7 km in Scotland’s Orkney Islands, Loganair’s scheduled island hopper regularly lands in around 90 seconds—or 53s with tailwinds.',
      detail_tr:
        'Kış fırtınalarında feribot geçişi tehlikeli hale geldiği için 8 kişilik Britten-Norman Islander uçağı öğretmenleri, öğrencileri ve doktorları komşu adaya taşır.',
      detail_en:
        'Operated continuously since 1967 across a stormy sea channel, the 8-seat commuter aircraft shuttles teachers, residents, and medical staff faster than taxiing at major airports.',
      question_tr: 'Westray ile Papa Westray arasındaki en kısa ticari uçuş mesafesi yaklaşık kaç kilometredir?',
      question_en: 'Roughly how long (in tenths of a km — e.g. 27 for 2.7 km) is the shortest commercial flight?',
      unit_tr: 'x100 m',
      unit_en: 'x100 m',
      min_val: 5,
      max_val: 90,
      answer_val: 27,
      sketch_type: 'cube',
      source_name: 'Guinness World Records — Shortest Scheduled Flight',
      source_url: 'https://www.guinnessworldrecords.com/world-records/shortest-scheduled-flight',
    },
    {
      topic: 'longest-lived-vertebrate-greenland-shark',
      title_tr: 'Grönland Köpekbalığı 400 Yıldan Fazla Yaşayabilen Tek Omurgalıdır',
      title_en: 'The Greenland Shark Can Live Nearly 400 Years—Earth’s Oldest Vertebrate',
      summary_tr:
        'Kuzey Atlantik’in buzlu derinliklerinde yılda sadece 1 cm büyüyen bu köpekbalığı türü yaklaşık 150 yaşında yetişkinliğe ulaşır.',
      summary_en:
        'Growing barely 1 cm per year in frigid Arctic depths, Greenland sharks take ~150 years just to reach maturity and can live for roughly four centuries.',
      detail_tr:
        'Bilim insanları göz merceğindeki nükleer bomba testi karbon-14 izlerini analiz ederek 5 metrelik bir dişinin yaklaşık 392 ± 120 yaşında olabileceğini belirledi.',
      detail_en:
        'By radiocarbon-dating crystalline lens proteins formed before birth, marine biologists estimated a 5-meter female lived roughly 392 years—born back in the early 1600s.',
      question_tr: 'Grönland köpekbalıklarının yaşam süresi yaklaşık kaç yüzyıla yaklaşır?',
      question_en: 'Up to roughly how many years (in centuries, e.g. 4 for 400) can a Greenland shark live?',
      unit_tr: 'yüzyıl',
      unit_en: 'centuries',
      min_val: 1,
      max_val: 8,
      answer_val: 4,
      sketch_type: 'shark',
      source_name: 'Science — Eye Lens Radiocarbon Dating of Greenland Sharks',
      source_url: 'https://www.science.org/doi/10.1126/science.aaf1703',
    },
  ],
};

function normalizeCandidateSlug(rawSlug) {
  return String(rawSlug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Deterministic fallback card when every curated item in a category has already
 * been inserted in earlier workflow runs.
 */
export function synthesizeParametricFact(category, existingSlugs, existingTitlesEn, runSeed = Date.now()) {
  const bank = PARAMETRIC_VERIFIED_TEMPLATES[category] ?? PARAMETRIC_VERIFIED_TEMPLATES.science;
  const unused = bank.find(
    (item) =>
      !existingSlugs.has(item.topic) &&
      !existingTitlesEn.has(item.title_en.toLowerCase())
  );
  if (unused) {
    return {
      slug: unused.topic,
      category,
      ...unused,
    };
  }

  // If even secondary curated items are exhausted, pick rotation by runSeed with unique timestamp suffix
  const chosen = bank[Math.abs(Math.floor(runSeed)) % bank.length];
  const stamp = new Date().toISOString().slice(0, 10);
  let candidateSlug = normalizeCandidateSlug(`${chosen.topic}-${stamp}`);
  let candidateTitleEn = `${chosen.title_en} (${stamp})`;
  let suffix = 1;
  while (
    existingSlugs.has(candidateSlug) ||
    existingTitlesEn.has(candidateTitleEn.toLowerCase())
  ) {
    candidateSlug = normalizeCandidateSlug(`${chosen.topic}-${stamp}-${suffix}`);
    candidateTitleEn = `${chosen.title_en} (${stamp} #${suffix})`;
    suffix += 1;
  }

  return {
    slug: candidateSlug,
    category,
    title_tr: chosen.title_tr,
    title_en: candidateTitleEn,
    summary_tr: chosen.summary_tr,
    summary_en: chosen.summary_en,
    detail_tr: chosen.detail_tr,
    detail_en: chosen.detail_en,
    question_tr: chosen.question_tr,
    question_en: chosen.question_en,
    unit_tr: chosen.unit_tr,
    unit_en: chosen.unit_en,
    min_val: chosen.min_val,
    max_val: chosen.max_val,
    answer_val: chosen.answer_val,
    sketch_type: chosen.sketch_type,
    source_name: chosen.source_name,
    source_url: chosen.source_url,
  };
}

/**
 * Selects exactly 6 unique, scientifically verified facts (1 per category).
 */
export function selectAutonomousSixFacts(existingSlugs, existingTitlesEn, topEngaged = []) {
  const engagedKeywords = new Set(
    (topEngaged || [])
      .flatMap((row) => String(row?.title_en || '').toLowerCase().split(/\W+/))
      .filter((word) => word.length > 4)
  );

  const selected = [];
  const usedSlugs = new Set(existingSlugs);
  const usedTitles = new Set(existingTitlesEn);

  for (let idx = 0; idx < CATEGORIES.length; idx += 1) {
    const category = CATEGORIES[idx];
    const pool = VERIFIED_FACT_RESERVOIR.filter((item) => {
      if (item.category !== category) return false;
      if (usedSlugs.has(item.slug)) return false;
      if (usedTitles.has(item.title_en.toLowerCase())) return false;
      return true;
    });

    let pick;
    if (pool.length > 0) {
      // Rank candidates lightly toward topics matching high-engagement words, falling back to first unseen
      const ranked = [...pool].sort((a, b) => {
        const aScore = a.title_en
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => engagedKeywords.has(w)).length;
        const bScore = b.title_en
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => engagedKeywords.has(w)).length;
        return bScore - aScore;
      });
      pick = ranked[0];
    } else {
      pick = synthesizeParametricFact(category, usedSlugs, usedTitles, Date.now() + idx);
    }

    usedSlugs.add(pick.slug);
    usedTitles.add(pick.title_en.toLowerCase());
    selected.push(pick);
  }

  return selected;
}
