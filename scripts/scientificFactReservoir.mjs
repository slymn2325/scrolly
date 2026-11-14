/**
 * Autonomous bilingual (TR & EN) verified scientific fact reservoir and
 * deterministic parametric synthesizer for Scrolly (scrolly.live).
 *
 * Used automatically whenever GitHub Models / remote inference endpoints are
 * unavailable, sunsetted, rate-limited, or return non-JSON text (e.g. "OK").
 */

const CATEGORIES = ['space', 'nature', 'human_body', 'history', 'science', 'records', 'statistics'];

export const VERIFIED_FACT_RESERVOIR = [
  // ======================= STATISTICS =======================
  {
    slug: 'berkson-paradox-hospital-bias-trap',
    category: 'statistics',
    visual_query: 'hospital chart clipboard',
    title_tr: "Berkson Paradoksu: Hastane Verileri İki İlgisiz Hastalığı İlişkili Gibi Gösterebilir",
    title_en: "Berkson's Paradox Makes Unrelated Traits Look Negatively Linked Inside Hospitals",
    summary_tr:
      'Genel toplumda birbirinden tamamen bağımsız olan iki durum, yalnızca hastaneye yatan kişilere bakıldığında sanki biri diğerini engelliyormuş gibi sahte bir korelasyon üretir.',
    summary_en:
      'Two completely independent conditions in the general public can suddenly appear negatively correlated if you only survey patients already admitted to a hospital.',
    detail_tr:
      'Matematikçi Joseph Berkson 1946’da hastaneye yatış gibi bir "seçim filtresi" uygulandığında verilerin nasıl çarpıldığını kanıtladı. Çünkü hastanede olmak için A veya B hastalığından en az birine sahip olmak gerekir; dolayısıyla A’sı olmayan hastada neredeyse kesin B vardır.',
    detail_en:
      'Discovered by Joseph Berkson in 1946, selection bias twists correlations whenever you filter a sample by a shared outcome—like hospital admission—creating illusionary negative tradeoffs.',
    question_tr: 'Berkson Paradoksu istatistikçilere en çok ne tür örneklem seçiminde tuzak kurar?',
    question_en: 'In what sampling ratio (%) might hospital-only sampling distort correlation?',
    unit_tr: '%',
    unit_en: '%',
    min_val: 10,
    max_val: 95,
    answer_val: 50,
    sketch_type: 'statistics',
    quiz_tr: {"question":"Berkson Paradoksu yalnızca hastane yatışlarını incelediğimizde neden sahte bir ters ilişki yaratır?","options":["Hastanede kalmak için iki hastalıktan en az birinin zaten bulunması gerektiğinden","Hastane kayıtlarının sadece yaşlı bireylerden oluşmasından","İki farklı hastalığın biyolojik olarak aynı virüsten kaynaklanmasından"],"correctIndex":0,"explanation":"Ortak bir sonuca (hastaneye yatış) göre filtrelemek, birbirinden bağımsız nedenler arasında yapay bir ters orantı üretir."},
    quiz_en: {"question":"Why does sampling only hospital inpatients create an illusionary negative link between unrelated diseases?","options":["Older patients skew every clinical metric upward","Admission already conditions on having at least one serious illness","Hospitals only record one diagnosis per chart"],"correctIndex":1,"explanation":"Conditioning on a shared collider outcome (hospital admission) induces spurious correlation between independent causes."},
    source_name: 'Berkeley Statistics — Selection Bias & Berkson Paradox',
    source_url: 'https://en.wikipedia.org/wiki/Berkson%27s_paradox',
  },
  {
    slug: 'will-rogers-phenomenon-stage-migration',
    category: 'statistics',
    visual_query: 'rising bar chart',
    title_tr: "Will Rogers Fenomeni: Tek Bir Veriyi Taşıyarak Her İki Grubun Ortalamasını Yükseltmek",
    title_en: 'The Will Rogers Phenomenon: Moving One Item Can Raise Both Group Averages',
    summary_tr:
      'Bir veri noktası yüksek gruptan düşük gruba taşındığında şaşırtıcı biçimde her iki grubun da ortalaması aynı anda artabilir—tıpta buna evre göçü denir.',
    summary_en:
      'Shifting a single below-average observation from a higher-scoring group into a lower-scoring group can simultaneously raise the average of BOTH groups.',
    detail_tr:
      'Görüntüleme teknolojileri geliştikçe sınırda kalan hastalar erken evreden ileri evreye yeniden sınıflandırılır. Bu sayede her iki grubun sağkalım istatistiği kâğıt üzerinde iyileşir ama tek bir hastanın bile gerçek durumu değişmemiştir.',
    detail_en:
      'In medicine, better scanners reclassify borderline mild cases into higher stages—boosting recorded survival rates in both stages even without changing individual outcomes.',
    question_tr: 'Bir gruptan diğerine tek eleman aktarıldığında ortalamanın kaç grupta yükselmesi mümkündür?',
    question_en: 'How many groups can raise their mean at the exact same time from moving one point?',
    unit_tr: 'grup',
    unit_en: 'groups',
    min_val: 0,
    max_val: 3,
    answer_val: 2,
    sketch_type: 'statistics',
    quiz_tr: {"question":"Tıpta Will Rogers Fenomeni gerçekleştiğinde tek bir hastanın bile sağlığı değişmeden iki grubun ortalaması nasıl artar?","options":["Yeni ilaçların sadece en ağır hastalara verilmesiyle","Sınırda iyi durumdaki hastaların yüksek gruptan alınıp daha düşük grubun ortalamasını yukarı çekmesiyle","Sınırda kötü durumdaki hastaların alt gruptan çıkarılıp üst grupta \"iyi\" kalmasıyla"],"correctIndex":1,"explanation":"Üst grubun en düşüğü üst grubu aşağı çekiyordu, alt gruptan ise hâlâ yüksekti; taşınması iki ortalamayı da yükseltir."},
    quiz_en: {"question":"How can reclassifying borderline patients simultaneously raise average survival in both cancer stages?","options":["Hospital scanners directly destroy borderline tumor cells","Total patient headcount doubles during stage migration","They were below average in the mild group yet healthier than average in the severe group"],"correctIndex":2,"explanation":"Moving an item sitting between two group means lifts the source mean up and pulls the destination mean up at once."},
    source_name: 'BMJ — Stage Migration & Will Rogers Effect',
    source_url: 'https://en.wikipedia.org/wiki/Will_Rogers_phenomenon',
  },
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
    visual_query: "mars red volcano",
    quiz_tr: {"question":"Mars’taki Olympus Mons’un Dünya’daki volkanlardan çok daha devasa büyümesinin temel jeolojik nedeni nedir?","options":["Mars atmosferindeki tozun yanardağ konisini erozyondan koruması","Mars’ta yeraltı suyunun çok daha derinlerde olması","Mars’ta hareketli tektonik plakalar olmadığı için sıcak noktanın hep aynı yere lav yığması"],"correctIndex":2,"explanation":"Dünya’da kabuk kaydığı için Hawaii gibi ada zincirleri oluşur; Mars’ta kabuk sabit kaldığı için lav tek noktada birikir."},
    quiz_en: {"question":"What geological condition let Olympus Mons grow far taller than any volcano on Earth?","options":["Lack of moving tectonic plates kept one mantle hotspot piling lava in one place","Mars receives twice as much solar radiation per square meter","Martian lava solidifies slowly into hollow glass tubes"],"correctIndex":0,"explanation":"Without plate tectonics drifting the crust away, a stationary magma plume built one colossal shield volcano for millions of years."},
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
    visual_query: "earth horizon space",
    quiz_tr: {"question":"Uluslararası Uzay İstasyonu’ndaki astronotların ağırlıksız yüzmesinin gerçek fiziksel nedeni nedir?","options":["Dünya’yla birlikte sürekli serbest düşüş halinde yörüngede kalmaları","400 km yükseklikte Dünya’nın kütleçekiminin tamamen sıfıra inmesi","İstasyon dış gövdesinin elektromanyetik itme kalkanı oluşturması"],"correctIndex":0,"explanation":"408 km irtifada yerçekimi hâlâ ~%89 güçlüdür; ancak istasyon saniyede 7,66 km hızla Dünya’nın eğriliği etrafında sürekli düşer."},
    quiz_en: {"question":"Why do astronauts float weightlessly aboard the ISS 408 km above Earth?","options":["Earth’s gravity vanishes completely above the stratosphere","Both station and crew are in continuous free-fall around Earth’s curvature","Pressurized cabin air cancels downward gravitational pull"],"correctIndex":1,"explanation":"Gravity at ISS altitude is still ~89% as strong as on Earth; high orbital speed keeps the station perpetually falling past the horizon."},
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
    visual_query: "jupiter red storm",
    quiz_tr: {"question":"Jüpiter’deki Büyük Kırmızı Leke neden Dünya’daki kasırgalar gibi birkaç gün içinde sönüp dağılmaz?","options":["Fırtınanın merkezinde katı demirden dev bir dağ bulunmasından","Gaz devinde fırtınayı sürtünmeyle yavaşlatacak katı kara parçası bulunmadığından","Jüpiter Güneş’e çok uzak olduğu için rüzgarların donarak katılaşmasından"],"correctIndex":1,"explanation":"Dünya’daki kasırgalar karaya çıkınca sürtünme ve yakıt kaybıyla dağılır; Jüpiter’de ise katı yüzey yoktur."},
    quiz_en: {"question":"Why has Jupiter’s Great Red Spot endured for centuries instead of fading like Earth hurricanes?","options":["Jupiter’s magnetic poles freeze storm clouds in place","Solar flares constantly feed heat straight into its eye","As a gas giant, Jupiter has no solid land to drain the vortex through friction"],"correctIndex":2,"explanation":"Without continents or mountain friction to rob angular momentum, deep jet streams sustain the vortex for generations."},
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
    visual_query: "crescent moon night",
    quiz_tr: {"question":"Ay’ın Dünya’dan her yıl 3,8 cm uzaklaşmasına hangi fiziksel etkileşim yol açar?","options":["Dünya’nın manyetik kutuplarının Ay kayalarını itmesi","Güneş rüzgarlarının Ay yüzeyini her gün dışarı itmesi","Dünya’nın kendi ekseninde daha hızlı dönerek gelgit okyanus şişkinliğini Ay’ın önüne taşıması"],"correctIndex":2,"explanation":"Önde giden gelgit su kütlesi Ay’ı yörüngesinde ileri çekerek ona açısal momentum aktarır ve günümüzü milisaniyelerle uzatır."},
    quiz_en: {"question":"What physical mechanism steadily pushes the Moon 3.8 cm farther from Earth each year?","options":["Earth’s faster spin drags ocean tidal bulges ahead of the Moon, tugging it forward","Meteorite impacts constantly knock the Moon outward","Solar radiation pressure accelerates the Moon’s dark side"],"correctIndex":0,"explanation":"Tidal friction transfers Earth’s rotational angular momentum to the Moon’s orbit, widening its distance while slowing Earth’s spin."},
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
    visual_query: "glowing black hole",
    quiz_tr: {"question":"Gökbilimciler görünmez olan Samanyolu merkez kara deliğinin kütlesini nasıl kesin olarak hesaplayabildi?","options":["Çevresinde çok yüksek hızla dönen S2 yıldızının yörüngesini izleyerek","Kara deliğin yaydığı morötesi radyoyu doğrudan tartarak","İçine doğrudan bir uzay sondası gönderip sinyal alarak"],"correctIndex":0,"explanation":"Kepler yasaları sayesinde görünmez merkezin etrafında saniyede 7.600 km hızla dönen S2 yıldızının yörüngesi merkez kütleyi ele verir."},
    quiz_en: {"question":"How did astronomers weigh our galaxy’s invisible central black hole, Sagittarius A*?","options":["By landing an automated probe on its event horizon","By tracking the ultra-fast orbit of nearby star S2 whipping around it","By counting solar eclipses across the galactic plane"],"correctIndex":1,"explanation":"Measuring star S2’s steep elliptical orbit at 7,600 km/s yields the exact central mass via Keplerian mechanics."},
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
    visual_query: "saturn rings space",
    quiz_tr: {"question":"Satürn’ün kuzey kutbundaki dev bulut deseninin kusursuz altıgen şeklini korumasının nedeni nedir?","options":["Altında yer alan dev altıgen kristal buz dağının kalıp görevi görmesi","Farklı hızdaki rüzgar katmanları arasında duran atmosferik dalgaların oluşması","Satürn halkalarının gölgesinin kutupta ışık kırılması yaratması"],"correctIndex":1,"explanation":"Laboratuvar akışkan tanklarında da doğrulanan duran Rossby dalgaları, hız gradyanı keskin jet akımlarını kararlı çokgenlere kilitler."},
    quiz_en: {"question":"What keeps Saturn’s north polar storm locked into a sharp geometric hexagon?","options":["Six giant moons pulling equally from beneath the atmosphere","Ice volcanoes erupting from a hexagonal mountain ridge","Standing Rossby waves trapped between fast-moving concentric jet streams"],"correctIndex":2,"explanation":"Rotating fluid-tank experiments show steep shear in jet speeds naturally stabilizes planetary waves into clean polygons."},
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
    visual_query: "microscopic water bear",
    quiz_tr: {"question":"Su ayıları (tardigradlar) kuruduğunda veya yoğun radyasyona maruz kaldığında hücrelerini nasıl korur?","options":["Kabuklarını saf titanyum mineraliyle kaplayarak","Vücutlarındaki tüm suyu dondurup buz kristaline çevirerek","Sitoplazmayı vitrifiye proteinlerle camsılaştırıp Dsup proteiniyle DNA’yı sararak"],"correctIndex":2,"explanation":"Kriptobiyoz evresinde su kaybına dayanıklı camsı protein kalkanı ve DNA koruyucu Dsup proteini hücre çökmesini engeller."},
    quiz_en: {"question":"How do tardigrades survive complete dehydration and cosmic radiation in open space?","options":["They lock cells in glassy bioproteins and shield DNA with Dsup protein","They breathe pure hydrogen directly through microscopic gills","They shed their DNA and rebuild it after rehydration"],"correctIndex":0,"explanation":"Vitrifying proteins stabilize membranes without water, while the Dsup protein physically shields DNA from radiation breaks."},
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
    visual_query: "glowing blue jellyfish",
    quiz_tr: {"question":"Ölümsüz denizanası tehlike veya yaşlanma durumunda biyolojik saatini hangi süreçle geri sarar?","options":["Olgun hücrelerinin transdiferansiyasyonla yeniden polip kök hücresine dönüşmesiyle","Başka denizanalarının genç hücrelerini çalıp kendi dokusuna ekleyerek","Dış zarını yakıp yavru yumurtalara dönüşerek"],"correctIndex":0,"explanation":"Transdiferansiyasyon sayesinde kas ve sinir gibi özelleşmiş hücreler kimliğini sıfırlayıp genç bir polip kolonisi başlatır."},
    quiz_en: {"question":"By what cellular mechanism does Turritopsis dohrnii rewind its life cycle back to youth?","options":["By freezing its nervous system until warmer seasons return","Through transdifferentiation, turning specialized adult cells back into polyps","By absorbing stem cells from nearby coral polyps"],"correctIndex":1,"explanation":"Cellular transdifferentiation allows mature cells to reprogram and sprout a brand-new juvenile polyp colony."},
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
    visual_query: "blue whale ocean",
    quiz_tr: {"question":"Mavi balina derin dalışa geçtiğinde kalp atışını neden dakikada sadece 2 atıma kadar düşürür?","options":["Süper hızlı yüzebilmek için kan basıncını tamamen sıfırlamak adına","Kısıtlı oksijen rezervini yalnızca beyin ve kalp gibi hayati organlara saklamak için","Derindeki soğuk suyun kalp kaslarını geçici olarak felç etmesi yüzünden"],"correctIndex":1,"explanation":"Ekstrem dalış bradikardisi oksijen tüketimini dibe çekerek tek nefeste uzun süre avlanmasını mümkün kılar."},
    quiz_en: {"question":"Why does a diving blue whale slow its heart down to roughly 2 beats per minute?","options":["Because deep-sea pressure stops heart valves from opening faster","To prevent cold seawater from entering its blowhole","To ration limited oxygen strictly for the brain, heart, and swimming muscles"],"correctIndex":2,"explanation":"Extreme diving bradycardia stretches a single breath during deep krill-feeding lunges."},
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
    visual_query: "sloth tree branch",
    quiz_tr: {"question":"Tembel hayvanlar su altında neden yunuslardan bile daha uzun süre nefes tutabilir?","options":["Akciğerleri karada bile yunusların üç katı hacimde olduğu için","Derilerinden doğrudan oksijen emen solungaç gözenekleri taşıdıkları için","Aşırı yavaş metabolizmalarıyla kalp atışlarını üçte birine düşürüp oksijeni az tükettikleri için"],"correctIndex":2,"explanation":"Yunuslar aktif hareket nedeniyle sık yüzeye çıkarken tembel hayvanlar dakikalarca minimum oksijenle idare eder."},
    quiz_en: {"question":"What lets sloths hold their breath underwater longer than marine dolphins?","options":["Their ultra-slow metabolism slashes heart rate and oxygen demand","They store extra oxygen inside hollow tree-climbing claws","Their fur traps breathable air bubbles like scuba tanks"],"correctIndex":0,"explanation":"By dialing down heart rate to roughly a third of normal, sloths ration oxygen far longer than high-energy dolphins."},
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
    visual_query: "orange monarch butterfly",
    quiz_tr: {"question":"Kral kelebekleri 4.000 km göç sırasında Güneş gün boyu hareket ederken nasıl doğru yönü şaşırmaz?","options":["Antenlerindeki biyolojik saat proteinleri Güneş’in açısını günün saatiyle düzelttiği için","Her gece okyanus rüzgarlarını koklayarak kıyı şeridini izledikleri için","Kafataslarındaki ultrason radarıyla dağ sıralarını haritaladıkları için"],"correctIndex":0,"explanation":"Anten saatleri Güneş’in hareketini telafi eden bir zaman-düzeltmeli güneş pusulası gibi çalışır; bulutlu havalarda ise manyetik pusula devreye girer."},
    quiz_en: {"question":"How do monarch butterflies stay on course during a 4,000-km migration as the Sun crosses the sky?","options":["By following scent trails left behind by the previous year’s swarm","Circadian clock proteins in their antennae adjust their Sun-compass by time of day","By bouncing ultrasonic clicks off mountain ridges"],"correctIndex":1,"explanation":"Antenna circadian clocks continuously compensate for the Sun’s shifting angle, backed by a magnetic compass on cloudy days."},
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
    visual_query: "colorful ocean shrimp",
    quiz_tr: {"question":"Tabanca karidesi kıskacını kapattığında avını asıl sersemleten fiziksel olay nedir?","options":["Kıskacının ucundan zehirli asit püskürtmesi","Oluşan kavitasyon baloncuğunun yüksek basınçla çökerek şok dalgası ve sonolüminesans üretmesi","Sudaki tuzu elektrik arkına dönüştürüp yıldırım çaktırması"],"correctIndex":1,"explanation":"Çok hızlı su jeti vakum baloncuğu oluşturur; baloncuğun saniyenin milyonda birinde içe çöküşü akustik şok ve anlık ışık parlaması doğurur."},
    quiz_en: {"question":"What physically stuns prey when a pistol shrimp snaps its oversized claw shut?","options":["High-voltage electric sparks discharged from its antennae","A toxic cloud of boiling acid squirted toward fish","The violent implosion of a cavitation bubble creating a 210-dB shockwave"],"correctIndex":2,"explanation":"As the low-pressure vapor bubble collapses under surrounding water pressure, it emits extreme brief heat, light, and a stunning shockwave."},
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
    visual_query: "human anatomy organ",
    quiz_tr: {"question":"İnsan karaciğeri cerrahi sonrası kendini yenilerken büyümeyi tam orijinal boyutunda nasıl durdurur?","options":["Büyümeyi her zaman yalnızca 14 gün sonunda otomatik kesen bir zamanlayıcıyla","Mide asidinin karaciğer yüzeyine ulaşıp bölünmeyi yakmasıyla","Kan damarlarındaki akış ve mekanik basınç sinyallerinin metabolik denge kurmasıyla"],"correctIndex":2,"explanation":"Portal ven kan akışı ve doku gerilim sinyalleri, karaciğer tam vücut ihtiyacını karşıladığında hücre bölünmesini durdurur."},
    quiz_en: {"question":"How does a regenerating human liver know precisely when to stop growing back?","options":["Blood-flow pressure and metabolic demand signals turn off cell division once original mass returns","Stomach acid dissolves any excess liver cells along the border","Brain pituitary hormones freeze liver growth strictly at day 10"],"correctIndex":0,"explanation":"Hemodynamic shear stress and metabolic load feedback halt hepatocyte proliferation right when functional capacity is restored."},
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
    visual_query: "human eye iris",
    quiz_tr: {"question":"Ekranlarda sadece kırmızı, yeşil ve mavi (RGB) piksel olmasına rağmen gözümüz nasıl milyonlarca renk algılar?","options":["Beynin üç tip koni hücresinin göreceli uyarılma oranlarını karşılaştırmasıyla","Göz merceğinin ışığı sıvı kristal prizma gibi bükmesiyle","Retinada her renk tonu için ayrı bir koni reseptörü bulunmasıyla"],"correctIndex":0,"explanation":"S, M ve L konilerinin farklı ateşlenme oranları beyinde milyonlarca ara renk algısı sentezler."},
    quiz_en: {"question":"How can just three RGB screen subpixels trick our eyes into seeing ~10 million colors?","options":["Humans possess thousands of distinct single-wavelength receptor cones","The brain computes hues from the relative firing ratios of three cone types","The cornea splits white pixels into tiny rainbow prisms"],"correctIndex":1,"explanation":"Comparing S, M, and L cone stimulation ratios lets the visual cortex synthesize millions of perceived shades from three primaries."},
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
    visual_query: "runner athlete water",
    quiz_tr: {"question":"İnsan vücudundaki milyonlarca ekrin ter bezi evrimsel olarak bize hangi eşsiz avantajı sağladı?","options":["Yırtıcılardan gizlenmek için vücut sıcaklığını buz seviyesine indirme","Uzun mesafe koşarken durmaya gerek kalmadan buharlaşmayla hızlı soğuma","Kış uykusunda deriden doğrudan oksijen solunumu"],"correctIndex":1,"explanation":"Soluyarak soğumak zorunda olan tüylü memelilerin aksine insanlar koşarken terleyip ısısını verimli biçimde atabilir."},
    quiz_en: {"question":"What evolutionary advantage did millions of eccrine sweat glands give early humans?","options":["Storing extra salt layers to repel insect bites","Absorbing freshwater directly through skin during droughts","Dumping body heat continuously via evaporation while endurance running"],"correctIndex":2,"explanation":"Bare skin paired with evaporative sweating let humans run long distances in midday heat when panting mammals overheated."},
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
    visual_query: "glowing brain neurons",
    quiz_tr: {"question":"Miyelin kılıfı insan sinirlerindeki elektrik iletimini nasıl saatte 430 km hıza çıkarır?","options":["Sinir içindeki kan akışını lazer gibi odaklayarak","Nöronları bakır tellere dönüştüren demir kristalleri depolayarak","Sinyali Ranvier boğumları arasında sıçramalı iletimle (saltatory conduction) atlatarak"],"correctIndex":2,"explanation":"Yalıtkan miyelin aralıklarındaki boğumlar sayesinde aksiyon potansiyeli aksonu adım adım değil sıçrayarak kat eder."},
    quiz_en: {"question":"How does the myelin sheath boost human nerve impulses up to 430 km/h?","options":["It insulates the axon so signals leap node-to-node via saltatory conduction","It pumps blood forward down the center of each axon","It turns electrical signals into fast optical laser pulses"],"correctIndex":0,"explanation":"Jumping from Ranvier node to Ranvier node multiplies conduction velocity more than tenfold compared to unmyelinated fibers."},
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
    visual_query: "red blood cells",
    quiz_tr: {"question":"Olgun insan alyuvarlarının (kırmızı kan hücrelerinin) çekirdeklerini atmasının temel işlevsel nedeni nedir?","options":["Virüslerin alyuvar DNA’sını ele geçirmesini engellemek ve daha fazla hemoglobin sığdırmak","Hücrelerin sadece tek yönlü akabilmesi için mıknatıslaşmasını sağlamak","Güneş ışığını doğrudan D vitaminine çevirebilmek"],"correctIndex":0,"explanation":"Çekirdeksiz bikonkav yapı hem oksijen taşıyan hemoglobin kapasitesini en üst düzeye çıkarır hem de kılcal damarlarda esnekliği artırır."},
    quiz_en: {"question":"Why do mature human red blood cells eject their cell nuclei before entering circulation?","options":["So white blood cells cannot mistake them for foreign bacteria","To pack maximum oxygen-carrying hemoglobin and flex smoothly through tiny capillaries","To convert visible sunlight into blood sugar"],"correctIndex":1,"explanation":"Ditching the nucleus yields the flexible biconcave disk shape loaded with hemoglobin."},
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
    visual_query: "dna helix glow",
    quiz_tr: {"question":"Her hücrede yaklaşık 2 metre uzunluğundaki DNA sarmalı mikrometre boyutundaki çekirdeğe dolaşmadan nasıl sığar?","options":["Sadece ihtiyaç duyulan genlerin kopyalanıp geri kalanının çöpe atılmasıyla","Histon adı verilen makara proteinlerinin etrafına düzenli halkalarla sarılmasıyla","Hücre bölünmedikçe DNA’nın sıvı halinde eriyip dağılmasıyla"],"correctIndex":1,"explanation":"Histon makaraları DNA’yı nükleozom ve kromatin halkaları şeklinde sıkıca ama okunabilir biçimde paketler."},
    quiz_en: {"question":"How does 2 meters of DNA fit tangle-free inside a single microscopic cell nucleus?","options":["Cells chop unused DNA into disposable fragments after birth","DNA dissolves into random fluid until mitosis begins","It spools tightly around histone proteins into compact chromatin loops"],"correctIndex":2,"explanation":"Histone spools keep two meters of genetic code neatly folded while still letting enzymes unpack active genes on demand."},
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
    visual_query: "ancient stone pillars",
    quiz_tr: {"question":"Göbeklitepe keşfi insanlık tarihine dair hangi yerleşik arkeoloji teorisini altüst etti?","options":["İlk tekerlekli savaş arabalarının Neolitik Çağ’da kullanıldığını kanıtlaması","Demir kılıçların bronzdan binlerce yıl önce döküldüğünü ortaya koyması","Önce anıtsal toplanma/tapınak alanlarının yapılıp tarımın sonrasında gelişebileceğini göstermesi"],"correctIndex":2,"explanation":"Avcı-toplayıcı toplulukların dev T biçimli dikilitaşlar dikmek için işbirliği yapması, tapınakların tarımı tetiklemiş olabileceğini düşündürdü."},
    quiz_en: {"question":"Which long-held theory of human civilization did Göbeklitepe overturn?","options":["That monumental ritual architecture came BEFORE settled agriculture, not after","That early hunter-gatherers lived exclusively inside caves","That metalworking began earlier than stone carving"],"correctIndex":0,"explanation":"Organizing huge gatherings to carve 15-ton T-pillars may have helped spur permanent settlements and farming."},
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
    visual_query: "ancient clay tablet",
    quiz_tr: {"question":"Hititler ile Mısır arasındaki Kadeş Antlaşması neden modern uluslararası hukukun öncüsü sayılır?","options":["Yalnızca ateşkes değil saldırmazlık, ortak savunma ve siyasi sığınmacı iadesi maddeleri içerdiği için","Antlaşma metni antik Yunanca ve Latince yazıldığı için","Dünya tarihindeki ilk kâğıt para değişim kurallarını yazdığı için"],"correctIndex":0,"explanation":"İki süper güç eşit şartlarda kalıcı barış, askeri ittifak ve kaçak iadesi maddelerini mühürlemiştir."},
    quiz_en: {"question":"What makes the 1259 BCE Kadesh Treaty surprisingly modern in diplomatic history?","options":["It established the first naval maritime borders","It codified mutual defense, non-aggression, and political extradition clauses on equal terms","It introduced silver coinage between empires"],"correctIndex":1,"explanation":"Recorded in both Akkadian cuneiform and Egyptian hieroglyphs, it reads remarkably like a modern bilateral treaty."},
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
    visual_query: "historic courtyard architecture",
    quiz_tr: {"question":"859 yılında Fas’ta kurulan El-Karaviyyin’in dünya eğitim tarihindeki ayırt edici özelliği nedir?","options":["Dünyadaki ilk buharlı matbaa makinesini icat etmesi","Kesintisiz eğitim veren en eski üniversite olup Fatima el-Fihri tarafından kurulması","Sadece uzaktan mektupla ders veren ilk akademi olması"],"correctIndex":1,"explanation":"UNESCO ve Guinness tarafından da tanınan kurum, bir kadın hayırseverin mirasıyla kurulup yüzyıllardır açık kalmıştır."},
    quiz_en: {"question":"What gives Morocco’s Al-Qarawiyyin a unique dual milestone in world educational history?","options":["It invented standardized printed textbooks in the 9th century","It operated exclusively as an outdoor astronomical observatory","Founded by Fatima al-Fihri in 859 CE, it is the oldest continually operating university"],"correctIndex":2,"explanation":"Endowed by Fatima al-Fihri, its library and scholarly halls have taught uninterrupted for over eleven centuries."},
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
    visual_query: "brass clockwork gears",
    quiz_tr: {"question":"Modern X-ışını tomografisi 2.100 yıllık Antikythera düzeneğinin şaşırtıcı şekilde neyi modelleyebildiğini gösterdi?","options":["Deprem dalgalarının Akdeniz’deki yönünü","Okyanus gelgitlerinin günlük derinlik değişimlerini","Ay’ın eliptik yörüngesinden kaynaklanan değişken hızını pimli dişliyle hesaplamasını"],"correctIndex":2,"explanation":"Pim ve oluklu episiklik dişli düzeneği, Hipparkhos’un ay hareketi teorisini mekanik olarak canlandırıyordu."},
    quiz_en: {"question":"What astonishing astronomical subtlety did X-ray scans uncover inside the Antikythera Mechanism?","options":["A pin-and-slot gear train mimicking the Moon’s variable elliptical orbital speed","A clockwork alarm warning of Mediterranean tsunamis","Telescopic glass lenses hidden inside its bronze casing"],"correctIndex":0,"explanation":"Its differential epicyclic gearing modeled lunar anomaly over a millennium before medieval astronomical clocks."},
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
    visual_query: "viking wooden ship",
    quiz_tr: {"question":"Bilim insanları Vikinglerin Kanada’daki ağaçları tam olarak MS 1021 yılında kestiğini nasıl kesinleştirdi?","options":["MS 993 güneş fırtınasının ağaç halkalarında bıraktığı karbon-14 pikinden halkaları sayarak","Balta üzerinde kazınmış Rün takvim tarihini okuyarak","Kıyıdaki volkanik kül tabakalarının kalınlığını ölçerek"],"correctIndex":0,"explanation":"993 yılındaki kozmik radyokarbon imzasından kabuğa doğru tam 28 halka sayılması MS 1021 yılını şaşmaz biçimde verdi."},
    quiz_en: {"question":"How did scientists pinpoint Norse woodcutting in Newfoundland to the exact year 1021 CE?","options":["By reading a carved Roman numeral date on a ship keel","By counting tree rings outward from a global 993 CE solar-storm radiocarbon spike","By measuring shoreline coral growth rates nearby"],"correctIndex":1,"explanation":"The 993 CE cosmic-ray spike gave a sharp anchor ring, leaving 28 growth rings right up to the felling cut in 1021 CE."},
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
    visual_query: "vintage printing press",
    quiz_tr: {"question":"Gutenberg’in sistemini Asya’daki önceki blok baskılardan Avrupa’da devrimsel kılan temel yenilik neydi?","options":["Renkli fotoğraf basabilen kimyasal mürekkepler","Hızlı dökülebilen dayanıklı hareketli metal harfler ve vida baskı mekanizması","Elektrikle çalışan otomatik kâğıt kesici bıçaklar"],"correctIndex":1,"explanation":"Alaşımlı dökme metal harfler her sayfa için yeniden dizilebildiği için kitap çoğaltma süresini yıldan haftalara düşürdü."},
    quiz_en: {"question":"What engineering breakthrough made Gutenberg’s 1440s press multiply European book output so rapidly?","options":["Waterwheel steam pistons powering automated rollers","Chemical color lithography from limestone slabs","Reusable alloy movable metal type paired with an oil-ink screw press"],"correctIndex":2,"explanation":"Quickly cast metal letter blocks could be rearranged endlessly across pages, slashing copying costs by over 80%."},
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
    visual_query: "lightning storm sky",
    quiz_tr: {"question":"Bir şimşek çaktığında duyduğumuz gök gürültüsünün doğrudan fiziksel sebebi nedir?","options":["Bulutların içindeki buz kütlelerinin birbirine çarparak kırılması","Yeryüzündeki kayaların elektrikle titreyip ses yayması","Şimşek kanalındaki havanın aniden ~30.000 °C’ye ısınıp şok dalgası halinde genleşmesi"],"correctIndex":2,"explanation":"Saniyenin kesrinde Güneş yüzeyinden 5 kat sıcak plazmaya dönüşen hava süpersonik bir basınç patlaması yaratır."},
    quiz_en: {"question":"What physically generates the booming thunderclap right after a lightning bolt strikes?","options":["Air along the bolt superheating to ~30,000 °C and exploding outward as a shockwave","Underground aquifers boiling beneath the strike point","Heavy hailstones colliding inside storm updrafts"],"correctIndex":0,"explanation":"Rapid plasma heating expands the narrow air column faster than sound, launching an acoustic shockwave."},
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
    visual_query: "liquid nitrogen vapor",
    quiz_tr: {"question":"Mutlak sıfıra yakın sıcaklıkta süper akışkan helyumun cam kabın duvarından yukarı tırmanmasını sağlayan şey nedir?","options":["Tüm atomların tek kuantum halinde sürtünmesiz akıp yüzey gerilimiyle ince film oluşturması","Helyumun soğuyunca mıknatıslaşarak camı itmesi","Kap dibindeki gizli basınç kabarcıklarının sıvıyı fışkırtması"],"correctIndex":0,"explanation":"Sıfır viskoziteye inen kuantum sıvı, kılcal çekim kuvvetleriyle kabın kenarlarından sızıverir."},
    quiz_en: {"question":"What lets superfluid liquid helium defy gravity and creep right up glass beaker walls?","options":["Boiling gas bubbles blast droplets upward over the rim","Coherent quantum atoms lose all viscosity so thin capillary films flow friction-free","Cold helium becomes magnetic and repels silica glass"],"correctIndex":1,"explanation":"Zero internal viscosity allows van der Waals surface wetting to siphon the fluid smoothly up and out of containers."},
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
    visual_query: "quantum light waves",
    quiz_tr: {"question":"Kuantum dolanıklık deneyleri neden ışık hızından hızlı mesaj göndermek için kullanılamaz?","options":["Yerçekimi alanının tüm kuantum sinyallerini yutması yüzünden","Her iki taraftaki ölçüm sonucu tek başına rastgele kaldığı ve klasik karşılaştırma gerektirdiği için","Dolanık fotonlar birkaç metreden sonra bozulduğu için"],"correctIndex":1,"explanation":"Korelasyon anlıktır ancak diğer ucun ne ölçtüğünü klasik iletişim kanalı olmadan anlamak mümkün değildir."},
    quiz_en: {"question":"Why cannot quantum entanglement be used to transmit faster-than-light messages?","options":["Atmospheric dust blocks all entangled photon pairs","Entanglement collapses automatically past 10 meters","Each particle’s local measurement still looks completely random without classical comparison"],"correctIndex":2,"explanation":"While correlations span vast distances, decoding meaningful information still requires a light-speed classical channel."},
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
    visual_query: "microscopic data strand",
    quiz_tr: {"question":"DNA molekülü dijital veri depolamada neden silikon disklere göre binlerce yıl daha dayanıklı ve yoğun bir adaydır?","options":["Elektrik kesildiğinde bile kendi kendine enerji üretip kopyalanabildiği için","Sabit disklerden daha yüksek hızda video işleyebildiği için","Veriyi dört bazlık üç boyutlu kimyasal zincirde saklayıp serin ve kuru ortamda bozulmadan kalabildiği için"],"correctIndex":2,"explanation":"A, C, G, T bazları mikroskobik hacimde devasa bilgi yoğunluğu sağlar ve fosil örneklerde bile binlerce yıl okunabilir."},
    quiz_en: {"question":"Why does synthetic DNA hold far higher longevity and density than magnetic hard drives?","options":["Four chemical bases encode binary data atom-by-atom and remain legible for millennia when dry","DNA reads and streams 4K video faster than fiber optics","DNA strands rewrite corrupted sectors autonomously at room temperature"],"correctIndex":0,"explanation":"Encoding bits into A/C/G/T base sequences packs petabytes into a tiny speck that stays stable in cool, dry storage."},
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
    visual_query: "glowing atomic orb",
    quiz_tr: {"question":"Atomlar neredeyse tamamen boşluktan oluşuyorsa masaya dokunduğumuzda elimiz neden içinden geçip gitmez?","options":["Dış elektron bulutlarının elektrostatik itmesi ve Pauli dışlama ilkesi nedeniyle","Boşluğun içinde katı mikroskobik su buzları bulunduğundan","Atom çekirdeklerinin mıknatıs gibi birbirini çekmesi yüzünden"],"correctIndex":0,"explanation":"Elektronların aynı kuantum durumunu paylaşmasını yasaklayan Pauli ilkesi ve yük itmesi katı direnç hissini doğurur."},
    quiz_en: {"question":"If atoms are mostly empty space, why does your hand not pass straight through a wooden table?","options":["Atomic nuclei lock magnetically against human tissue","Electron clouds resist overlapping via electrostatic repulsion and the Pauli exclusion principle","Air molecules trapped inside wood push back hydraulically"],"correctIndex":1,"explanation":"Quantum exclusion and negative charge repulsion between outer electrons create the everyday sensation of solidity."},
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
    visual_query: "hexagonal carbon grid",
    quiz_tr: {"question":"İki grafen tabakasını tam 1,1° döndürmek karbonu nasıl elektrik direnci sıfır bir süperiletkene dönüştürür?","options":["Yüzeydeki tüm oksijen atomlarını mıknatısladığından","Oluşan Moiré süper örgü deseni elektronları yavaşlatıp kuantum çiftleri kurmasını sağladığından","Karbon atomlarını eritip sıvı bakır halkalara çevirdiğinden"],"correctIndex":1,"explanation":"Sihirli açıdaki girişim deseni elektron hızını neredeyse sıfırlar; böylece güçlü etkileşimlerle sürtünmesiz akım oluşur."},
    quiz_en: {"question":"How does twisting two graphene sheets by 1.1° turn pure carbon into a superconductor?","options":["It absorbs nitrogen from air to boost voltage","It melts carbon bonds into metallic copper filaments","The resulting Moiré superlattice slows electrons dramatically so quantum pairs flow friction-free"],"correctIndex":2,"explanation":"At the \"magic angle,\" flat energy bands trap electrons together long enough for correlated superconductivity to emerge."},
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
    visual_query: "antarctica ice landscape",
    quiz_tr: {"question":"Bilimsel coğrafyada buzlarla kaplı Antarktika neden Sahra’dan bile büyük bir \"çöl\" kabul edilir?","options":["Buz tabakasının altında sıcak kum tepeleri gizlendiğinden","Kıtada rüzgar hiç esmediğinden","Çöl tanımı sıcaklığa değil yıllık çok düşük yağış miktarına dayandığından"],"correctIndex":2,"explanation":"Aşırı soğuk hava nem taşıyamaz; bu yüzden Antarktika iç kesimleri yıllık 50 mm’nin altında yağışla kurak çöl sınıfındadır."},
    quiz_en: {"question":"Why do geographers classify frozen Antarctica as Earth’s largest desert rather than the Sahara?","options":["Deserts are defined by ultra-low annual precipitation, not heat","Antarctica receives zero sunlight for six months straight","Deep beneath the ice sheet lies arid red sand"],"correctIndex":0,"explanation":"Frigid polar air holds almost no moisture, leaving interior Antarctic valleys drier than scorching sand deserts."},
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
    visual_query: "playing cards shuffle",
    quiz_tr: {"question":"52 kartlık bir desteyi iyice karıştırdığınızda çıkan dizilimin tarih boyunca ilk kez görülmesinin nedeni nedir?","options":["52 faktöriyel (52!) permütasyon sayısının Dünyadaki atom sayısını bile aşan devasa büyüklüğü","Kartların her sürtünmede farklı elektrik yükü kazanması","Matematikte sadece tek sayılı destelerin tekrar edebilmesi"],"correctIndex":0,"explanation":"52! yaklaşık 8×10^67 farklı sıralama üretir; insanlık tarihindeki toplam karıştırma sayısı bunun milyarda birine bile yaklaşmaz."},
    quiz_en: {"question":"Why is your freshly shuffled 52-card order almost certainly unique in human history?","options":["Friction wears microscopic unique patterns onto paper cards","The 52! (52 factorial) permutations exceed ~8×10^67—vastly outnumbering all shuffles ever done","Standard decks forbid repeating adjacent suits mathematically"],"correctIndex":1,"explanation":"Factorials explode hyper-exponentially; 52! dwarfs both human history and the number of atoms composing Earth."},
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
    visual_query: "volcanic eruption smoke",
    quiz_tr: {"question":"1883 Krakatoa patlamasının ses ve basınç dalgası tüm Dünya’yı nasıl dört kez dolaşabildi?","options":["Ay’ın kütleçekiminin sesi uzaydan Dünya’ya geri yansıtmasıyla","Atmosferin dev bir akustik kanal gibi çalışıp barometrik şok dalgasını gezegen çevresinde yansıtmasıyla","Okyanus altındaki kabloların sesi kıtalara taşımasıyla"],"correctIndex":1,"explanation":"Küresel barometre istasyonları şok dalgasının antipot noktasına odaklanıp dört kez geri döndüğünü beş gün kaydetti."},
    quiz_en: {"question":"How did scientists know the 1883 Krakatoa pressure wave circled Earth four full times?","options":["Lunar mirrors reflected the shockwave back to Java","Submarine telegraph cables transmitted sound straight to London","Global weather barometers recorded sharp pressure spikes for five consecutive days"],"correctIndex":2,"explanation":"Atmospheric Lamb waves traveled globally through the air column, triggering barographs around the planet repeatedly."},
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
    visual_query: "colorful toy bricks",
    quiz_tr: {"question":"Lego şirketi nasıl oluyor da dev otomotiv markalarından daha fazla sayıda lastik üretebiliyor?","options":["Gerçek kamyon lastiklerini de yan fabrikalarda ürettiği için","Tek bir oyuncak setinde binlerce gerçek otomobil lastiği sattığı için","Yüz milyonlarca oyuncak sette çok sayıda minik kauçuk tekerlek yer aldığı için adet bazında öne geçerek"],"correctIndex":2,"explanation":"Tonaj bakımından dev lastik şirketleri öndedir ancak tekil birim adedinde Lego yılda 300 milyonu aşan minik lastikle liderdir."},
    quiz_en: {"question":"In what exact sense does toymaker LEGO outproduce automotive giants like Michelin or Bridgestone?","options":["By individual unit count—molding hundreds of millions of tiny toy tires every year","By supplying actual passenger car tires across Denmark","By total annual rubber tonnage melted into roads"],"correctIndex":0,"explanation":"Guiness recognizes LEGO as top tire maker strictly by unit volume due to tiny Technic and City wheels."},
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
    visual_query: "wooden chess board",
    quiz_tr: {"question":"Matematikçi Claude Shannon’a göre olası satranç oyunlarının sayısının 10^120’yi aşmasının temel nedeni nedir?","options":["Her hamledeki ortalama 30-35 yasal seçeneğin her turda dallanarak üstel patlama yaratması","Satranç taşlarının oyun sırasında sürekli sayıca artması","Tahtadaki kare sayısının her açılışta değişmesi"],"correctIndex":0,"explanation":"Sadece 4 hamle sonunda bile 318 milyardan fazla tahta dizilimi oluşur; tam oyunda kombinasyon ağacı astronomik boyutlara ulaşır."},
    quiz_en: {"question":"Why does the Shannon Number of possible chess games exceed 10^120?","options":["Players can legally move pieces off the board edges","Averaging ~30–35 legal moves per turn causes branching combinations to explode exponentially","Pawns multiply dynamically every time they cross center"],"correctIndex":1,"explanation":"Exponential branching turns just 40 average moves per side into more game trees than atoms in the observable universe."},
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
    visual_query: "deep ocean trench",
    quiz_tr: {"question":"Mariana Çukuru tabanındaki 1.080 atmosferlik ezici basınca rağmen salyangoz balıkları orada nasıl hayatta kalır?","options":["Sadece geceleri yüzeye çıkıp basınçtan kaçtıkları için","Hücre zarlarını esnek tutan özel moleküller (TMAO) ve kıkırdaksı açık kafatası yapısı sayesinde","Vücutlarının içini katı kurşun zırhla doldurdukları için"],"correctIndex":1,"explanation":"Yüksek TMAO molekülü proteinlerin yüksek basınç altında katlanıp bozulmasını önler."},
    quiz_en: {"question":"How do hadal snailfish avoid being crushed by >1,000 atmospheres at the bottom of Challenger Deep?","options":["They inflate dense air pockets inside their swim bladders","Hollow titanium plates line their outer scales","High TMAO cellular compounds stabilize proteins alongside flexible cartilaginous skulls"],"correctIndex":2,"explanation":"Trimethylamine N-oxide (TMAO) prevents protein folding failure under extreme abyssal hydrostatic pressure."},
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
      visual_query: "icy dwarf planet",
      quiz_tr: {"question":"Kepler yasalarına göre Plüton’un Güneş çevresindeki yörünge hızı Dünya’nınkinden neden bu kadar yavaştır?","options":["Plüton’un donmuş azot buzulları uzay tozuna sürtünerek hızını kestiği için","Neptün her yıl Plüton’u geriye doğru çektiği için","Güneş’ten çok uzak olduğu için merkez kütleçekim ivmesi zayıflar ve geniş yörünge daha yavaş dönülür"],"correctIndex":2,"explanation":"Güneş’e yaklaştıkça yörünge hızı artar; uzaklaştıkça hem yol büyür hem de saniyedeki hız 4,7 km/sn’ye düşer."},
      quiz_en: {"question":"Why does Pluto crawl around the Sun far slower than Earth according to Kepler’s laws?","options":["Far from the Sun, weaker gravity balances a much slower orbital velocity along a huge path","Neptune’s rings physically brake Pluto every orbit","Frozen nitrogen ice creates heavy atmospheric drag"],"correctIndex":0,"explanation":"Pluto averages only 4.7 km/s along a vast 5.9-billion-km orbit compared to Earth’s 30 km/s pace."},
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
      visual_query: "glowing orange planet",
      quiz_tr: {"question":"Venüs Güneş’e Merkür’den daha uzak olmasına rağmen neden Güneş Sistemi’nin en sıcak gezegenidir?","options":["Yoğun karbondioksit atmosferinin kontrolden çıkmış sera etkisiyle kızılötesi ısıyı hapsetmesi","Venüs’ün merkezinde nükleer füzyon yıldızı bulunması","Venüs’ün Güneş’e hep aynı yüzünü çevirmiş halde hızla dönmesi"],"correctIndex":0,"explanation":"Merkür’ün ısıyı tutacak atmosferi yokken Venüs’teki 92 barlık CO₂ battaniyesi sıcaklığı 465 °C’de sabitler."},
      quiz_en: {"question":"Why is Venus hotter than Mercury even though Mercury sits much closer to the Sun?","options":["Venetian lava oceans cover the entire globe permanently","A crushing 92-bar CO₂ atmosphere traps thermal radiation in a runaway greenhouse","Mercury’s silver crust reflects 99% of all heat"],"correctIndex":1,"explanation":"Thick CO₂ and sulfuric-acid clouds trap heat uniformly day and night around 465 °C."},
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
      visual_query: "falcon diving sky",
      quiz_tr: {"question":"Aladoğan kuşu saatte 380 km hızla dalarken burun deliklerindeki özel kemiksi koniler ne işe yarar?","options":["Kanat uçlarındaki buzlanmayı eritmek","Yüksek hızlı hava basıncını kırıp yavaşlatarak akciğerlerin patlamasını önlemek","Avın kalp atışını kilometrelerce öteden duymak"],"correctIndex":1,"explanation":"Jet motorlarının hava giriş konilerine benzeyen bu anatomik yapı şok hava basıncını düzenleyerek nefes almayı sağlar."},
      quiz_en: {"question":"How do tiny bony baffles inside a peregrine falcon’s nostrils protect it during a 380 km/h dive?","options":["They store extra fat to insulate the eyes","They amplify distant prey echoes like sonar cones","They deflect and slow incoming supersonic airflow so the lungs can safely breathe"],"correctIndex":2,"explanation":"Inspired by nature, jet-engine intake cones use similar pressure-baffle geometry."},
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
      visual_query: "hummingbird hovering flower",
      quiz_tr: {"question":"Sinek kuşları geceleri enerji tüketip açlıktan ölmemek için metabolizmalarında nasıl bir taktik uygular?","options":["Gece boyunca nefes almayı bırakıp yalnızca su içerler","Yere gömülüp yaprakların altında sıcaklık çalarlar","Kalp atışlarını dakikada 50’nin altına indirip derin \"torpor\" uyku haline geçerler"],"correctIndex":2,"explanation":"Torpor adı verilen kısa süreli kış uykusu benzeri durum vücut ısısını düşürerek gece enerjisinin %60’ından fazlasını kurtarır."},
      quiz_en: {"question":"How do hummingbirds avoid starving overnight after running at 1,200+ heartbeats per minute all day?","options":["They enter nightly torpor, dropping heart rate below 50 bpm to conserve energy","They eat insects nonstop without sleeping","They migrate toward warmer valleys every sunset"],"correctIndex":0,"explanation":"Nightly torpor acts like miniature hibernation, saving over 60% of overnight metabolic fuel."},
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
      visual_query: "human digestion illustration",
      quiz_tr: {"question":"Mide asidi metali bile aşındıracak kadar güçlü olmasına rağmen midemiz neden kendi kendini sindirmez?","options":["Kalın bikarbonatlı mukus bariyeri asidi nötralize ederken yüzey hücreleri 4 günde bir yenilendiğinden","Mide duvarı saf plastik benzeri ölü keratine dönüştüğünden","Mide asidi yalnızca dışarıdan gelen yiyecek dokunduğunda ortaya çıktığından"],"correctIndex":0,"explanation":"Bikarbonat tamponu ve hızlı kök hücre yenilenmesi güçlü hidroklorik asit karşısında sürekli kalkan kurar."},
      quiz_en: {"question":"What keeps corrosive pH ~1.5 hydrochloric acid from digesting your own stomach wall?","options":["Acid instantly evaporates before touching living cells","Bicarbonate-rich mucus buffers the wall while stem cells renew surface lining every ~4 days","A thick shield of inert calcium bone plates the stomach"],"correctIndex":1,"explanation":"Continuous alkaline mucus secretion plus rapid epithelial cell turnover protect the stomach interior."},
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
      visual_query: "bone skeleton anatomy",
      quiz_tr: {"question":"Uyluk kemiği (femur) içi tamamen dolu katı bir blok olmamasına rağmen neden ağırlığına göre çok yüksek basınca dayanır?","options":["İçindeki tüm kalsiyumun saf elmas kristali şeklinde dizilmesi yüzünden","İçindeki \"trabeküler\" süngerimsi kemerler yükü stres hatları boyunca yönlendirdiği için","Kemik iliği dış darbe geldiğinde anında donarak katılaştığı için"],"correctIndex":1,"explanation":"Doğal kafes kiriş mimarisi ağırlığı düşük tutarken koşu ve sıçrama darbelerini kırılmadan taşır."},
      quiz_en: {"question":"How does the hollow-centered human femur support massive loads without being ultra-heavy?","options":["Outer tendons absorb 100% of gravitational weight","Bone marrow freezes solid under impact","Internal trabecular struts route stress along curved bridge-like lines"],"correctIndex":2,"explanation":"Spongy trabecular lattice architecture maximizes strength-to-weight efficiency along real loading directions."},
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
      visual_query: "ancient volcano ruins",
      quiz_tr: {"question":"Arkeologlar 19. yüzyılda Pompeii’de küller altında kalmış insanların ve eşyaların şeklini nasıl üç boyutlu çıkarabildi?","options":["Kül altında hiç bozulmayan taş heykelleri temizleyerek","Sonar dalgalarıyla toprağın derininden röntgen çekerek","Sertleşen kül içindeki organik boşluklara sıvı alçı döküp kalıplar çıkararak"],"correctIndex":2,"explanation":"Giuseppe Fiorelli tekniği sayesinde çürüyen bedenlerin kül katmanında bıraktığı boşluklar birebir alçı kalıba dönüştürüldü."},
      quiz_en: {"question":"How did 19th-century archaeologists recover lifelike shapes of Pompeii victims from hardened volcanic ash?","options":["By pouring plaster into hollow cavities left in compacted ash after organic matter decayed","By reconstructing faces solely from Roman coins","By uncovering marble statues sculpted before the eruption"],"correctIndex":0,"explanation":"Dense pumice and wet ash hardened around bodies and loaves, preserving natural negative molds."},
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
      visual_query: "great wall china",
      quiz_tr: {"question":"Çin Seddi’nin taş blokları arasındaki harca dayanıklılığı artırmak için hangi şaşırtıcı gıda maddesi karıştırılmıştır?","options":["Yapışkan pirinç unu (pirinç çorbası harcı)","Eritilmiş deniz tuzu ve bal","Kurutulmuş yeşil çay yaprakları"],"correctIndex":0,"explanation":"Amilopektin içeren yapışkan pirinç harcı kalsiyum karbonatla kimyasal bağ kurarak suya ve depreme karşı olağanüstü direnç sağladı."},
      quiz_en: {"question":"What surprising kitchen ingredient did Ming engineers mix into Great Wall mortar for extra strength?","options":["Crushed bamboo sugar","Sticky rice flour rich in amylopectin","Pressed olive oil"],"correctIndex":1,"explanation":"Amylopectin reacts with calcium carbonate to form a compact, water-resistant composite mortar that still holds today."},
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
      visual_query: "glass prism rainbow",
      quiz_tr: {"question":"Isaac Newton 1666’da prizmadan çıkan renklerin camın kendisinden değil beyaz ışıktan geldiğini nasıl kanıtladı?","options":["Yalnızca ay ışığında deney yaparak","Ayrışan renk spektrumunu ikinci bir ters prizmadan geçirip tekrar saf beyaz ışığa dönüştürerek","Camı eritip içinde boya olmadığını mikroskopla göstererek"],"correctIndex":1,"explanation":"Kritik deney (Experimentum Crucis), renklerin cam tarafından boyanmadığını, beyaz ışığın doğal bileşenleri olduğunu ispatladı."},
      quiz_en: {"question":"How did Isaac Newton prove rainbow colors lived inside sunlight rather than being created by glass?","options":["He shone firelight through metal sheets","He melted the glass prism to check for hidden pigments","He passed the dispersed spectrum through a second inverted prism back into white light"],"correctIndex":2,"explanation":"Recombining the spectrum with an inverted prism proved white light is a composite of distinct refracting wavelengths."},
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
      visual_query: "snowy mountain peak",
      quiz_tr: {"question":"Everest zirvesinde su 68 °C’de kaynamasına rağmen dağcılar açık tencerede makarna veya yumurtayı neden iyi pişiremez?","options":["Yüksek irtifadaki soğuk hava makarnayı anında dondurduğundan","Dağdaki kar sularında hiç oksijen bulunmadığından","Açık kapta su kaynama sıcaklığının üstüne çıkamadığından nişasta ve protein pişme enerjisine ulaşamaz"],"correctIndex":2,"explanation":"Sıvı haldeki su açık atmosferde kaynama sıcaklığından fazla ısınamaz; bu yüzden 68 °C’de fokurdasa da yeterince sıcak değildir."},
      quiz_en: {"question":"Why is boiling water at ~68 °C on Mount Everest frustrating for cooking pasta or eggs in an open pot?","options":["Liquid water cannot heat hotter than its local boiling point, so food barely cooks","Thin mountain air evaporates all pasta starch mid-boil","Ice water freezes pasta instantly inside the pot"],"correctIndex":0,"explanation":"Lower atmospheric pressure lets vapor escape early at 68 °C, capping liquid temperature well below normal cooking heat."},
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
      visual_query: "small propeller plane",
      quiz_tr: {"question":"İskoçya’daki 2,7 km’lik bu uçuş feribot seçeneği varken neden 1967’den beri tarifeli olarak sürdürülür?","options":["Kuzey Denizi fırtınalarında deniz ulaşımı kesilince ada öğrencileri ve doktorlar için hayati bağlantı olduğundan","İki ada arasındaki su köpekbalığı göç yolu olduğu için tekne yasaklandığından","Yalnızca turistlere dünya rekoru sertifikası dağıtmak amacıyla kurulduğundan"],"correctIndex":0,"explanation":"Orkney adalarında sert deniz koşullarında küçük ada topluluklarının eğitim ve sağlık erişimini kesintisiz tutar."},
      quiz_en: {"question":"Why has this tiny 2.7-km commercial hop in Scotland stayed scheduled since 1967 despite ferries?","options":["Deep underwater reefs completely block small boats year-round","Winter Atlantic storms interrupt ferries, making the short air link vital for residents and students","It operates strictly as a summer tourist stunt"],"correctIndex":1,"explanation":"Reliable commuter service links teachers, doctors, and islanders across rough North Atlantic waters."},
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
      visual_query: "arctic ocean shark",
      quiz_tr: {"question":"Bilim insanları Grönland köpekbalıklarının yaşını kemik yerine neden göz merceklerindeki karbon-14 ile ölçebildi?","options":["Dişlerindeki buz kristalleri güneş tutulmalarını kaydettiği için","Göz merceği kristalleri doğum öncesi oluşup ömür boyu hiç yenilenmediği için zaman kapsülü görevi görür","Köpekbalıklarının sırt yüzgeci her yıl ışıldayan bir halka döktüğü için"],"correctIndex":1,"explanation":"1950’lerin nükleer testlerinden gelen karbon-14 \"bomba nabzı\" izi genç ve çok yaşlı mercek dokularını ayırmada anahtar oldu."},
      quiz_en: {"question":"Why did marine biologists measure eye-lens proteins instead of bones to date Greenland sharks?","options":["Sharks absorb annual ice rings inside their corneas","Sharks shed and regrow their entire skeleton every decade","Eye-lens core crystals form before birth and never metabolically turn over afterward"],"correctIndex":2,"explanation":"Metabolically inert lens proteins act like a birth timestamp checked against 1950s bomb-pulse radiocarbon."},
      source_name: 'Science — Eye Lens Radiocarbon Dating of Greenland Sharks',
      source_url: 'https://www.science.org/doi/10.1126/science.aaf1703',
    },
  ],
  statistics: [
      {
          "topic": "law-of-large-numbers-coin-flips",
          "visual_query": "flipping silver coin",
          "title_tr": "Büyük Sayılar Yasası: Kısa Serideki Şans Dalgalanması Tekrarla Sıfırlanır",
          "title_en": "Law of Large Numbers: Short-Run Streaks Fade Over Thousands of Trials",
          "summary_tr": "Adil bir madeni parayı 10 kez atınca 7 kez tura gelmesi normaldir; ancak 10.000 atışta oran şaşmaz biçimde %50’ye kilitlenir.",
          "summary_en": "Flipping 7 heads out of 10 tosses happens easily by chance, yet over 10,000 flips the proportion locks steadily onto 50%.",
          "detail_tr": "İnsanlar sıkça \"Kumarbaz Yanılgısı\"na düşerek art arda 5 tura sonrası sıradaki atışın kesin yazı geleceğini sanır; oysa para geçmişi hatırlamaz, sadece büyük toplam içinde eski sapma erir.",
          "detail_en": "Unlike the Gambler’s Fallacy—which assumes a coin owes a tails to balance out—later flips simply dilute earlier noise inside a larger denominator.",
          "question_tr": "Adil bir madeni para binlerce kez atıldığında tura gelme oranı yüzde kaçta dengelenir?",
          "question_en": "What percentage does a fair coin’s heads ratio converge toward over thousands of flips?",
          "unit_tr": "%",
          "unit_en": "%",
          "min_val": 10,
          "max_val": 90,
          "answer_val": 50,
          "sketch_type": "probability",
          "quiz_tr": {
              "question": "Büyük Sayılar Yasası neden 5 kez üst üste tura geldikten sonra 6. atışta yazı şansını artırmaz?",
              "options": [
                  "Çünkü para her atıştan sonra hafifçe eğilip ağırlık merkezini kaydırır",
                  "Çünkü istatistik yasaları yalnızca çift sayılı atışlarda geçerlidir",
                  "Paranın hafızası yoktur; oran dengeyi geçmiş hatayı telafi ederek değil yeni örnekleri büyüterek kurar"
              ],
              "correctIndex": 2,
              "explanation": "Bağımsız olayların hafızası sıfırdır; başlangıç sapması sadece büyük N paydası içinde önemsizleşir."
          },
          "quiz_en": {
              "question": "Why does the Law of Large Numbers NOT boost your odds of tails after five heads in a row?",
              "options": [
                  "Coins have no memory; early streaks are diluted by larger sample size, not \"corrected\" by future flips",
                  "Air drag slows tails down after repeated impacts",
                  "Probability laws apply only starting on even-numbered coin tosses"
              ],
              "correctIndex": 0,
              "explanation": "Independent coin flips remain 50/50 every time; convergence works through dilution across huge sample counts."
          },
          "source_name": "Stanford Encyclopedia / Probability — Law of Large Numbers",
          "source_url": "https://www.britannica.com/science/law-of-large-numbers"
      },
      {
          "topic": "regression-toward-the-mean-galton",
          "visual_query": "normal bell curve",
          "title_tr": "Ortalamaya Dönüş: Olağanüstü Performansın Ardından Neden Çoğunlukla Düşüş Gelir?",
          "title_en": "Regression Toward the Mean Explains Why Extreme Streaks Cool Down Naturally",
          "summary_tr": "Sir Francis Galton’ın keşfettiği bu yasa, aşırı iyi veya kötü bir sonucun ardından gelen ölçümün istatistiksel olarak ortalamaya yaklaşma eğilimini açıklar.",
          "summary_en": "Coined by Francis Galton, this statistical rule shows why an extreme high or low outlier is naturally followed by a measurement closer to average.",
          "detail_tr": "Bir sporcunun dergi kapağına çıktıktan sonra düşüş yaşaması \"kapak laneti\" sanılır; oysa zirve performansın içinde geçici şans payı vardır ve sıradaki dönemde şans faktörü normalleşir.",
          "detail_en": "Often mistaken for a \"magazine cover jinx\" or punishment working better than praise, extreme outcomes combine true skill with random luck—which rarely repeats identically twice.",
          "question_tr": "Çok uç (rekor) bir performans sonrasında bir sonraki ölçümün yaklaşık yüzde kaç ihtimalle ortalamaya yaklaşması beklenir?",
          "question_en": "When an extreme outlier score occurs with random noise, roughly what percent chance does the next trial shift closer to the mean?",
          "unit_tr": "%",
          "unit_en": "%",
          "min_val": 10,
          "max_val": 99,
          "answer_val": 75,
          "sketch_type": "statistics",
          "quiz_tr": {
              "question": "Uç bir sınav veya spor rekorundan hemen sonraki denemenin daha mütevazı çıkmasının gerçek istatistiksel nedeni nedir?",
              "options": [
                  "İlk uç sonucun içindeki geçici rastgele şans bileşeninin sonraki denemede tekrarlanma olasılığının düşük olması",
                  "İnsan beyninin rekor kırdıktan sonra bilerek yavaşlaması",
                  "Ölçüm aletlerinin ikinci denemede daima kalibrasyon bozması"
              ],
              "correctIndex": 0,
              "explanation": "Yetenek + şans denkleminde olağanüstü zirve genelde pozitif şans gerektirir; bir sonraki ölçümde ortalamaya dönüş doğaldır."
          },
          "quiz_en": {
              "question": "Why does an unusually great or terrible performance typically follow with something closer to average?",
              "options": [
                  "Measurement instruments shift baseline downward after every peak",
                  "Extreme outliers include lucky random variance that rarely repeats at the exact same extreme",
                  "People consciously stop trying right after setting a record"
              ],
              "correctIndex": 1,
              "explanation": "Regression toward the mean happens whenever outcomes combine persistent skill with temporary random fluctuation."
          },
          "source_name": "Britannica — Regression to the Mean",
          "source_url": "https://www.britannica.com/topic/regression-to-the-mean"
      }
  ],
};

/**
 * Selects an unused parametric curated template for a category, returning null
 * if all curated templates have already been inserted (never duplicates titles with dates).
 */
export function synthesizeParametricFact(category, existingSlugs, existingTitlesEn) {
  const bank = PARAMETRIC_VERIFIED_TEMPLATES[category] ?? PARAMETRIC_VERIFIED_TEMPLATES.science;
  const unused = bank.find(
    (item) =>
      !existingSlugs.has(item.topic) &&
      !existingTitlesEn.has(item.title_en.toLowerCase())
  );
  if (!unused) {
    return null;
  }

  return {
    slug: unused.topic,
    category,
    ...unused,
  };
}

/**
 * Selects up to 7 unique, scientifically verified facts (up to 1 per category across all 7 categories).
 * Stops gracefully without creating dated duplicate clones if a category reservoir is exhausted.
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
      pick = synthesizeParametricFact(category, usedSlugs, usedTitles);
    }

    if (!pick) {
      console.warn(
        `[Scrolly Reservoir] Kategori havuzu tükendi (${category}), kopya kart üretilmedi ve atlandı.`
      );
      continue;
    }

    usedSlugs.add(pick.slug);
    usedTitles.add(pick.title_en.toLowerCase());
    selected.push(pick);
  }

  return selected;
}
