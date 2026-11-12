// Yasal metinler, 5 dilde. {S}=Sağlayıcı adı, {I}=iletişim, {M}=saklama süresi (ay), {SALON}=salon adı.
// Salonun doldurması gereken alanlar köşeli parantezle bırakılmıştır (müşteri aydınlatma şablonu).
export const HUKUK_METIN = {
  tr: {
    sartlar: { ad: 'Kullanım şartları', metin: [
      ['1. Taraflar ve konu', '"{S}" ("Sağlayıcı") ile LUMIO SALON uygulamasını kullanan salon ("Salon") arasındaki kullanım koşullarını bu şartlar düzenler. LUMIO SALON; randevu, kasa, stok, müşteri kaydı ve ekip yönetimi için sunulan bulut tabanlı bir yazılım hizmetidir.'],
      ['2. Hesap ve yetkiler', 'Salon, hesabı kullanan kişinin salon adına işlem yapma yetkisi olduğunu kabul eder. Kullanıcıların rolleri (yönetici, kıdemli, ortak, sekreter, usta) Salon tarafından belirlenir. Şifrenin gizliliğinden kullanıcı sorumludur.'],
      ['3. Lisans ve ücret', 'Hizmet deneme süresi ve ardından lisans süresi ile sunulur. Süre bittiğinde yeni kayıt yapılamaz; mevcut veriler süre bitiminden sonra {M} ay saklanır. Ücret, süre ve iade koşulları satış sırasında Salon\'a yazılı olarak (ör. WhatsApp ile) bildirilir.'],
      ['4. Salonun yükümlülükleri', 'Salon; müşterilerinin kişisel verilerini uygulanabilir mevzuata uygun işlemekten, gerekli aydınlatmayı yapmaktan ve gerektiğinde müşterilerinden izin almaktan sorumludur. Uygulama üzerinden gönderilen WhatsApp mesajlarının içeriği ve alıcıların uygunluğu Salon\'un sorumluluğundadır.'],
      ['5. Hizmetin niteliği', 'Uygulamadaki hesaplamalar (kazanç, komisyon, kâr, stok) Salon\'un girdiği verilere dayanır ve bilgilendirme amaçlıdır; muhasebe, vergi veya yasal belge yerine geçmez. Yapay zekâ danışman genel bilgi ve fikir verir; tıbbi, hukuki veya mali kesin tavsiye değildir.'],
      ['6. Kesintiler ve sorumluluk', 'Hizmet "olduğu gibi" sunulur. Bakım, internet veya üçüncü taraf (Google/Firebase, Cloudflare vb.) kesintilerinden doğan zararlardan Sağlayıcı\'nın sorumluluğu, mevzuatın izin verdiği ölçüde, Salon\'un son 12 ayda ödediği lisans bedeliyle sınırlıdır.'],
      ['7. Fesih', 'Taraflar bildirimle sözleşmeyi sona erdirebilir. Fesihte Salon, verilerinin dışa aktarılmasını talep edebilir; veriler {M} ay sonunda silinir veya anonim hale getirilir.'],
      ['8. Uygulanacak hukuk', 'Taraflar aksini yazılı kararlaştırmadıkça Türk hukuku uygulanır; uyuşmazlıklarda Sağlayıcı\'nın bulunduğu yerdeki mahkemeler yetkilidir.'],
      ['9. İletişim', '{S} · {I}']
    ] },
    gizlilik: { ad: 'Gizlilik ve kişisel veriler', metin: [
      ['1. Veri sorumlusu', 'Kullanıcıların ve salonun hesap verileri bakımından veri sorumlusu {S}\'dir ({I}). Salonun müşterilerine ait veriler bakımından veri sorumlusu ilgili salondur; Sağlayıcı bu verilerde yalnızca veri işleyen konumundadır.'],
      ['2. İşlenen veriler', 'Kullanıcı: ad-soyad, telefon numarası, rol, şifre (şifrelenmiş), işlem kayıtları. Salon: salon adı, hizmet/ürün/stok/kasa kayıtları. Salon müşterileri (salon girer): ad-soyad, telefon, doğum tarihi, randevu ve işlem geçmişi, formül/not bilgileri.'],
      ['3. Amaç ve hukuki sebep', 'Hizmetin sunulması, hesap güvenliği, lisans yönetimi, destek ve yasal yükümlülüklerin yerine getirilmesi. Hukuki sebepler: sözleşmenin ifası, yasal yükümlülük ve meşru menfaat; uygulanabilir mevzuat (ör. Türkiye KVKK, Kazakistan "Kişisel Veriler ve Korunması Hakkında" Kanunu, Özbekistan "Kişisel Veriler Hakkında" Kanunu, AB GDPR) çerçevesinde.'],
      ['4. Aktarım', 'Veriler, hizmetin sunulması amacıyla bulut altyapı sağlayıcılarına (Google Firebase, Cloudflare) aktarılır; bu sağlayıcıların sunucuları yurt dışında olabilir. Uygulamayı kullanarak bu aktarımı kabul etmiş olursunuz.'],
      ['5. Saklama', 'Veriler hizmet süresince ve yasal saklama süreleri boyunca tutulur; süre sonunda silinir, yok edilir veya anonim hale getirilir.'],
      ['6. Haklarınız', 'Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, itiraz etme ve zararın giderilmesini isteme haklarına sahipsiniz. Başvuru: {I}.'],
      ['7. Güvenlik', 'Veriler şifreli bağlantı (HTTPS) üzerinden iletilir; erişim rol bazlı yetkilendirme ile sınırlandırılır.'],
      ['8. Danışman soruları', 'Usta Danışman\'a sorulan ve SSS\'de karşılığı bulunmayan sorular, hizmeti geliştirmek için kimlik, salon veya kullanıcı bilgisi olmadan (yalnız soru metni ve dil) saklanabilir. Bu kayıtlara kişisel veri yazmayınız.'],
      ['9. Fotoğraf analizi', 'Satış ve analiz paketi açık salonlarda, müşterinin onayıyla çekilen fotoğraf yalnız analiz için yapay zekâ hizmet sağlayıcısına (Google ve/veya Anthropic; yurt dışında bulunabilir) gönderilir; uygulamada ve sunucuda saklanmaz. Saklanan bilgiler: analiz tarihi, türü, önerilen ürünler ve müşterinin onay verdiği bilgisi. Bu onayı müşteriden almak salonun sorumluluğundadır. Öneriler kozmetik niteliktedir, tıbbi teşhis değildir. Satın alma bağlantılarındaki ürün ve satıcılardan salon sorumludur.']
    ] },
    musteri: { ad: 'Müşteri aydınlatma metni (salonunuz için şablon)', metin: [
      ['Veri sorumlusu', '{SALON} (adres: [SALON ADRESİ], telefon: [SALON TELEFONU]).'],
      ['İşlenen veriler', 'Ad-soyad, telefon numarası, doğum tarihi (verirseniz), randevu ve işlem geçmişi, uygulanan işlemlere ilişkin notlar/formül bilgileri.'],
      ['Amaç', 'Randevunuzun oluşturulması ve hatırlatılması, hizmetin sunulması, ödeme ve kayıt işlemlerinin yürütülmesi, size daha uygun hizmet verilebilmesi.'],
      ['Hukuki sebep', 'Hizmetin ifası için gerekli olması ve yasal yükümlülükler. Kampanya, doğum günü gibi ticari mesajlar için ayrıca onayınız alınır.'],
      ['Aktarım', 'Verileriniz salonumuzun kullandığı yazılım hizmet sağlayıcılarına (bulut altyapısı) hizmet amacıyla aktarılabilir; yasal talepler dışında üçüncü kişilerle paylaşılmaz.'],
      ['Haklarınız', 'Bilgi alma, düzeltme, silme ve itiraz haklarınızı salonumuza başvurarak kullanabilirsiniz.'],
      ['Ticari mesaj izni', 'Randevu hatırlatma dışındaki kampanya, doğum günü ve tanıtım mesajları yalnızca onay vermeniz halinde gönderilir.']
    ] }
  },
  ru: {
    sartlar: { ad: 'Условия использования', metin: [
      ['1. Стороны и предмет', 'Настоящие условия регулируют использование приложения LUMIO SALON между «{S}» («Поставщик») и салоном, использующим приложение («Салон»). LUMIO SALON — облачный программный сервис для записи клиентов, кассы, склада, ведения клиентской базы и управления командой.'],
      ['2. Учётная запись и полномочия', 'Салон подтверждает, что лицо, использующее учётную запись, вправе действовать от имени салона. Роли пользователей (администратор, старший, партнёр, секретарь, мастер) определяет Салон. За сохранность пароля отвечает пользователь.'],
      ['3. Лицензия и оплата', 'Сервис предоставляется на пробный период, а затем на срок лицензии. По окончании срока новые записи вносить нельзя; имеющиеся данные хранятся {M} мес. после окончания срока. Стоимость, срок и условия возврата сообщаются Салону письменно при продаже (например, в WhatsApp).'],
      ['4. Обязанности Салона', 'Салон отвечает за обработку персональных данных своих клиентов в соответствии с применимым законодательством, за необходимое информирование и, при необходимости, получение согласия клиентов. Содержание сообщений WhatsApp, отправляемых через приложение, и правомерность выбора адресатов — ответственность Салона.'],
      ['5. Характер сервиса', 'Расчёты в приложении (заработок, комиссия, прибыль, склад) основаны на данных, введённых Салоном, и носят информационный характер; они не заменяют бухгалтерский, налоговый или иной юридический документ. ИИ-консультант даёт общую информацию и идеи; это не медицинская, юридическая или финансовая рекомендация.'],
      ['6. Перебои и ответственность', 'Сервис предоставляется «как есть». За ущерб, вызванный техническим обслуживанием, сбоями интернета или третьих сторон (Google/Firebase, Cloudflare и др.), ответственность Поставщика в пределах, допускаемых законом, ограничена суммой лицензионных платежей Салона за последние 12 месяцев.'],
      ['7. Прекращение', 'Стороны могут расторгнуть соглашение письменным уведомлением. При расторжении Салон может запросить выгрузку своих данных; данные удаляются или обезличиваются через {M} мес.'],
      ['8. Применимое право', 'Если стороны письменно не договорились об ином, применяется право Турции; споры рассматриваются судами по месту нахождения Поставщика.'],
      ['9. Контакты', '{S} · {I}']
    ] },
    gizlilik: { ad: 'Конфиденциальность и персональные данные', metin: [
      ['1. Оператор данных', 'В отношении данных учётных записей пользователей и салона оператором является {S} ({I}). В отношении данных клиентов салона оператором является соответствующий салон; Поставщик выступает лишь обработчиком этих данных.'],
      ['2. Обрабатываемые данные', 'Пользователь: имя и фамилия, номер телефона, роль, пароль (в зашифрованном виде), журнал действий. Салон: название, записи об услугах, товарах, складе и кассе. Клиенты салона (вносит салон): имя и фамилия, телефон, дата рождения, история записей и услуг, формулы и заметки.'],
      ['3. Цель и правовое основание', 'Предоставление сервиса, безопасность учётной записи, управление лицензиями, поддержка и исполнение требований закона. Основания: исполнение договора, законная обязанность и законный интерес, в рамках применимого законодательства (например, Закон Республики Казахстан «О персональных данных и их защите», Закон Республики Узбекистан «О персональных данных», KVKK в Турции, GDPR в ЕС).'],
      ['4. Передача данных', 'Для предоставления сервиса данные передаются поставщикам облачной инфраструктуры (Google Firebase, Cloudflare); серверы этих поставщиков могут находиться за рубежом. Используя приложение, вы соглашаетесь с такой передачей.'],
      ['5. Хранение', 'Данные хранятся в течение срока оказания услуг и сроков, установленных законом; затем удаляются, уничтожаются или обезличиваются.'],
      ['6. Ваши права', 'Вы вправе узнать, обрабатываются ли ваши данные, запросить информацию, потребовать исправления или удаления, возразить против обработки и требовать возмещения вреда. Обращение: {I}.'],
      ['7. Безопасность', 'Данные передаются по защищённому соединению (HTTPS); доступ ограничен ролевой авторизацией.'],
      ['8. Вопросы Консультанту', 'Вопросы к Консультанту, на которые нет ответа в FAQ, могут сохраняться для улучшения сервиса без сведений о личности, салоне или пользователе (только текст вопроса и язык). Не вносите в такие вопросы персональные данные.'],
      ['9. Анализ по фото', 'В салонах с пакетом «Продажи и анализ» фото, сделанное с согласия клиента, отправляется только для анализа поставщику ИИ-услуг (Google и/или Anthropic, возможно за рубежом); оно не хранится ни в приложении, ни на сервере. Хранятся: дата и вид анализа, рекомендованные товары и факт согласия клиента. Получать это согласие обязан салон. Рекомендации носят косметический характер и не являются медицинским диагнозом. За товары и продавцов по ссылкам для покупки отвечает салон.']
    ] },
    musteri: { ad: 'Уведомление клиента об обработке данных (шаблон для вашего салона)', metin: [
      ['Оператор данных', '{SALON} (адрес: [АДРЕС САЛОНА], телефон: [ТЕЛЕФОН САЛОНА]).'],
      ['Обрабатываемые данные', 'Имя и фамилия, номер телефона, дата рождения (если вы её сообщите), история записей и услуг, заметки и формулы по выполненным процедурам.'],
      ['Цель', 'Оформление записи и напоминание о ней, оказание услуги, проведение оплаты и учёта, возможность предложить вам более подходящее обслуживание.'],
      ['Правовое основание', 'Необходимость для оказания услуги и исполнение требований закона. Для рекламных сообщений (акции, поздравления) мы отдельно запрашиваем ваше согласие.'],
      ['Передача', 'Ваши данные могут передаваться поставщикам программных сервисов нашего салона (облачная инфраструктура) для оказания услуги; третьим лицам они не передаются, кроме случаев, предусмотренных законом.'],
      ['Ваши права', 'Вы можете обратиться в наш салон, чтобы получить информацию, исправить или удалить данные и возразить против их обработки.'],
      ['Согласие на рекламные сообщения', 'Рекламные сообщения (акции, поздравления, предложения), помимо напоминаний о записи, отправляются только при наличии вашего согласия.']
    ] }
  },
  kk: {
    sartlar: { ad: 'Пайдалану шарттары', metin: [
      ['1. Тараптар және мәні', 'Осы шарттар «{S}» («Жеткізуші») мен LUMIO SALON қолданбасын пайдаланатын салон («Салон») арасындағы пайдалану ережелерін реттейді. LUMIO SALON — жазылу, касса, қойма, клиенттер базасы және команданы басқаруға арналған бұлтты бағдарламалық қызмет.'],
      ['2. Тіркелгі және өкілеттіктер', 'Салон тіркелгіні пайдаланатын адамның салон атынан әрекет ету құқығы бар екенін растайды. Пайдаланушылардың рөлдерін (әкімші, аға қызметкер, серіктес, хатшы, мастер) Салон белгілейді. Құпия сөздің сақталуына пайдаланушы жауапты.'],
      ['3. Лицензия және төлем', 'Қызмет сынақ мерзімімен, содан кейін лицензия мерзімімен ұсынылады. Мерзім біткенде жаңа жазба енгізуге болмайды; бар деректер мерзім біткеннен кейін {M} ай сақталады. Құны, мерзімі және қайтару шарттары сату кезінде Салонға жазбаша (мысалы, WhatsApp арқылы) хабарланады.'],
      ['4. Салонның міндеттері', 'Салон клиенттерінің дербес деректерін қолданыстағы заңнамаға сәйкес өңдеуге, қажетті ақпарат беруге және қажет болса клиенттерден рұқсат алуға жауапты. Қолданба арқылы жіберілетін WhatsApp хабарламаларының мазмұны мен алушылардың дұрыстығы Салонның жауапкершілігінде.'],
      ['5. Қызметтің сипаты', 'Қолданбадағы есептеулер (табыс, комиссия, пайда, қойма) Салон енгізген деректерге негізделеді және ақпараттық сипатта; олар бухгалтерлік, салықтық немесе заңды құжатты алмастырмайды. Жасанды интеллект кеңесшісі жалпы ақпарат пен идея береді; бұл медициналық, заңдық немесе қаржылық нақты кеңес емес.'],
      ['6. Үзілістер және жауапкершілік', 'Қызмет «қалай бар, солай» ұсынылады. Техникалық қызмет көрсетуден, интернеттен немесе үшінші тараптардың (Google/Firebase, Cloudflare т.б.) үзілістерінен туған зиян үшін Жеткізушінің жауапкершілігі заң рұқсат еткен деңгейде Салонның соңғы 12 айда төлеген лицензия сомасымен шектеледі.'],
      ['7. Тоқтату', 'Тараптар хабарлама беру арқылы келісімді тоқтата алады. Тоқтатылғанда Салон деректерін алуды сұрай алады; деректер {M} айдан кейін жойылады немесе иесіздендіріледі.'],
      ['8. Қолданылатын құқық', 'Тараптар жазбаша басқаша келіспесе, Түркия құқығы қолданылады; дауларды Жеткізуші тұратын жердегі соттар қарайды.'],
      ['9. Байланыс', '{S} · {I}']
    ] },
    gizlilik: { ad: 'Құпиялылық және дербес деректер', metin: [
      ['1. Деректер операторы', 'Пайдаланушылар мен салонның тіркелгі деректері бойынша оператор — {S} ({I}). Салон клиенттерінің деректері бойынша оператор — тиісті салон; Жеткізуші бұл деректерді тек өңдеуші болып табылады.'],
      ['2. Өңделетін деректер', 'Пайдаланушы: аты-жөні, телефон нөмірі, рөлі, құпия сөзі (шифрланған), әрекеттер журналы. Салон: атауы, қызмет, тауар, қойма және касса жазбалары. Салон клиенттері (салон енгізеді): аты-жөні, телефоны, туған күні, жазылулар мен қызметтер тарихы, формулалар мен ескертпелер.'],
      ['3. Мақсаты және құқықтық негіз', 'Қызмет көрсету, тіркелгі қауіпсіздігі, лицензияны басқару, қолдау және заң талаптарын орындау. Негіздер: шартты орындау, заңды міндет және заңды мүдде, қолданыстағы заңнама аясында (мысалы, Қазақстан Республикасының «Дербес деректер және оларды қорғау туралы» Заңы, Өзбекстанның «Дербес деректер туралы» Заңы, Түркиядағы KVKK, ЕО-дағы GDPR).'],
      ['4. Беру', 'Қызмет көрсету үшін деректер бұлтты инфрақұрылым провайдерлеріне (Google Firebase, Cloudflare) беріледі; бұл провайдерлердің серверлері шетелде болуы мүмкін. Қолданбаны пайдалану арқылы осы берумен келісесіз.'],
      ['5. Сақтау', 'Деректер қызмет көрсету мерзімі мен заңда белгіленген мерзімдер бойы сақталады; кейін жойылады, жойып жіберіледі немесе иесіздендіріледі.'],
      ['6. Сіздің құқықтарыңыз', 'Деректеріңіздің өңделіп-өңделмегенін білуге, ақпарат сұрауға, түзетуді немесе жоюды талап етуге, өңдеуге қарсылық білдіруге және зиянның өтелуін сұрауға құқығыңыз бар. Өтініш: {I}.'],
      ['7. Қауіпсіздік', 'Деректер қорғалған байланыс (HTTPS) арқылы беріледі; қолжетімділік рөлдік рұқсат арқылы шектеледі.'],
      ['8. Кеңесшіге қойылған сұрақтар', 'Кеңесшіге қойылған және FAQ-та жауабы жоқ сұрақтар қызметті жақсарту үшін жеке тұлға, салон немесе пайдаланушы мәліметінсіз (тек сұрақ мәтіні және тіл) сақталуы мүмкін. Мұндай сұрақтарға дербес деректерді жазбаңыз.'],
      ['9. Фототалдау', 'Сату және талдау пакеті қосылған салондарда клиенттің келісімімен түсірілген фото тек талдау үшін ЖИ қызмет көрсетушіге (Google және/немесе Anthropic, шетелде болуы мүмкін) жіберіледі; қолданбада да, серверде де сақталмайды. Сақталатыны: талдау күні, түрі, ұсынылған тауарлар және клиенттің келісім бергені. Бұл келісімді алуға салон жауапты. Ұсыныстар косметикалық сипатта, медициналық диагноз емес. Сатып алу сілтемелеріндегі тауарлар мен сатушылар үшін салон жауапты.']
    ] },
    musteri: { ad: 'Клиентті деректерді өңдеу туралы хабардар ету мәтіні (салоныңызға арналған үлгі)', metin: [
      ['Деректер операторы', '{SALON} (мекенжайы: [САЛОН МЕКЕНЖАЙЫ], телефоны: [САЛОН ТЕЛЕФОНЫ]).'],
      ['Өңделетін деректер', 'Аты-жөні, телефон нөмірі, туған күні (өзіңіз берсеңіз), жазылулар мен қызметтер тарихы, орындалған рәсімдерге қатысты ескертпелер мен формулалар.'],
      ['Мақсаты', 'Жазылуды рәсімдеу және еске салу, қызмет көрсету, төлем мен есепті жүргізу, сізге сәйкес қызмет көрсету мүмкіндігі.'],
      ['Құқықтық негіз', 'Қызмет көрсету үшін қажеттілік және заң талаптарын орындау. Жарнамалық хабарламалар (науқан, құттықтау) үшін сіздің жеке келісіміңіз сұралады.'],
      ['Беру', 'Деректеріңіз қызмет көрсету мақсатында салонымыз пайдаланатын бағдарламалық қызмет провайдерлеріне (бұлтты инфрақұрылым) берілуі мүмкін; заң көздеген жағдайлардан басқа үшінші тұлғаларға берілмейді.'],
      ['Сіздің құқықтарыңыз', 'Ақпарат алу, түзету, жою және қарсылық білдіру құқықтарын салонымызға хабарласу арқылы пайдалана аласыз.'],
      ['Жарнамалық хабарламаларға келісім', 'Жазылуды еске салудан басқа жарнамалық хабарламалар (науқан, құттықтау, ұсыныс) тек сіз келіскен жағдайда жіберіледі.']
    ] }
  },
  de: {
    sartlar: { ad: 'Nutzungsbedingungen', metin: [
      ['1. Parteien und Gegenstand', 'Diese Bedingungen regeln die Nutzung der Anwendung LUMIO SALON zwischen „{S}" („Anbieter") und dem Salon, der die Anwendung nutzt („Salon"). LUMIO SALON ist ein cloudbasierter Softwaredienst für Terminplanung, Kasse, Lager, Kundenverwaltung und Teamführung.'],
      ['2. Konto und Befugnisse', 'Der Salon bestätigt, dass die Person, die das Konto nutzt, im Namen des Salons handeln darf. Die Rollen der Nutzer (Verwaltung, Senior, Partner, Sekretariat, Stylist) legt der Salon fest. Für die Geheimhaltung des Passworts ist der Nutzer verantwortlich.'],
      ['3. Lizenz und Entgelt', 'Der Dienst wird zunächst für einen Testzeitraum und danach für die Lizenzdauer bereitgestellt. Nach Ablauf können keine neuen Einträge mehr erfasst werden; vorhandene Daten werden danach {M} Monate aufbewahrt. Preis, Laufzeit und Rückgabebedingungen werden dem Salon beim Verkauf schriftlich (z. B. per WhatsApp) mitgeteilt.'],
      ['4. Pflichten des Salons', 'Der Salon ist dafür verantwortlich, die personenbezogenen Daten seiner Kunden nach geltendem Recht zu verarbeiten, die erforderlichen Informationen zu erteilen und bei Bedarf Einwilligungen einzuholen. Für Inhalt und Empfänger der über die Anwendung versandten WhatsApp-Nachrichten ist der Salon verantwortlich.'],
      ['5. Art des Dienstes', 'Die Berechnungen in der Anwendung (Verdienst, Provision, Gewinn, Lager) beruhen auf den vom Salon eingegebenen Daten und dienen nur der Information; sie ersetzen keine Buchhaltung, Steuerunterlagen oder rechtlichen Dokumente. Der KI-Berater gibt allgemeine Hinweise und Anregungen; er erteilt keine verbindliche medizinische, rechtliche oder finanzielle Beratung.'],
      ['6. Unterbrechungen und Haftung', 'Der Dienst wird „wie besehen" bereitgestellt. Für Schäden durch Wartung, Internetausfälle oder Ausfälle Dritter (Google/Firebase, Cloudflare usw.) ist die Haftung des Anbieters, soweit gesetzlich zulässig, auf die vom Salon in den letzten 12 Monaten gezahlte Lizenzgebühr begrenzt.'],
      ['7. Beendigung', 'Die Parteien können den Vertrag durch Mitteilung beenden. Bei Beendigung kann der Salon die Herausgabe seiner Daten verlangen; die Daten werden nach {M} Monaten gelöscht oder anonymisiert.'],
      ['8. Anwendbares Recht', 'Sofern die Parteien nichts anderes schriftlich vereinbaren, gilt türkisches Recht; für Streitigkeiten sind die Gerichte am Sitz des Anbieters zuständig.'],
      ['9. Kontakt', '{S} · {I}']
    ] },
    gizlilik: { ad: 'Datenschutz und personenbezogene Daten', metin: [
      ['1. Verantwortlicher', 'Für die Konto-Daten der Nutzer und des Salons ist {S} ({I}) verantwortlich. Für die Daten der Salonkunden ist der jeweilige Salon verantwortlich; der Anbieter ist hierfür nur Auftragsverarbeiter.'],
      ['2. Verarbeitete Daten', 'Nutzer: Name, Telefonnummer, Rolle, Passwort (verschlüsselt), Aktivitätsprotokoll. Salon: Salonname, Leistungs-, Produkt-, Lager- und Kassendaten. Salonkunden (vom Salon erfasst): Name, Telefon, Geburtsdatum, Termin- und Behandlungsverlauf, Rezeptur- und Notizdaten.'],
      ['3. Zweck und Rechtsgrundlage', 'Bereitstellung des Dienstes, Kontosicherheit, Lizenzverwaltung, Support und Erfüllung gesetzlicher Pflichten. Rechtsgrundlagen: Vertragserfüllung, rechtliche Verpflichtung und berechtigtes Interesse im Rahmen des anwendbaren Rechts (z. B. DSGVO in der EU, KVKK in der Türkei, das Gesetz „Über personenbezogene Daten und deren Schutz" in Kasachstan, das Gesetz „Über personenbezogene Daten" in Usbekistan).'],
      ['4. Übermittlung', 'Zur Bereitstellung des Dienstes werden Daten an Cloud-Anbieter (Google Firebase, Cloudflare) übermittelt; deren Server können sich im Ausland befinden. Mit der Nutzung der Anwendung stimmen Sie dieser Übermittlung zu.'],
      ['5. Speicherung', 'Daten werden während der Leistungsdauer und der gesetzlichen Aufbewahrungsfristen gespeichert; danach werden sie gelöscht, vernichtet oder anonymisiert.'],
      ['6. Ihre Rechte', 'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Widerspruch und Schadensersatz. Anfragen: {I}.'],
      ['7. Sicherheit', 'Die Daten werden über eine verschlüsselte Verbindung (HTTPS) übertragen; der Zugriff ist durch rollenbasierte Berechtigungen beschränkt.'],
      ['8. Fragen an den Berater', 'Fragen an den Berater, für die es in den FAQ keine Antwort gibt, können zur Verbesserung des Dienstes ohne Angaben zu Person, Salon oder Nutzer (nur Fragetext und Sprache) gespeichert werden. Bitte tragen Sie in solche Fragen keine personenbezogenen Daten ein.'],
      ['9. Fotoanalyse', 'In Salons mit dem Verkaufs- und Analysepaket wird ein mit Zustimmung der Kundin/des Kunden aufgenommenes Foto ausschließlich für die Analyse an den KI-Dienstleister (Google und/oder Anthropic, ggf. im Ausland) gesendet; es wird weder in der App noch auf dem Server gespeichert. Gespeichert werden: Datum und Art der Analyse, empfohlene Produkte und die Tatsache der Zustimmung. Der Salon ist für die Einholung dieser Zustimmung verantwortlich. Empfehlungen sind kosmetisch, keine medizinische Diagnose. Für Produkte und Verkäufer hinter Kauflinks ist der Salon verantwortlich.']
    ] },
    musteri: { ad: 'Informationen für Kunden zur Datenverarbeitung (Vorlage für Ihren Salon)', metin: [
      ['Verantwortlicher', '{SALON} (Adresse: [SALONADRESSE], Telefon: [SALONTELEFON]).'],
      ['Verarbeitete Daten', 'Name, Telefonnummer, Geburtsdatum (falls angegeben), Termin- und Behandlungsverlauf, Notizen und Rezepturen zu durchgeführten Behandlungen.'],
      ['Zweck', 'Terminvergabe und -erinnerung, Erbringung der Leistung, Zahlungsabwicklung und Dokumentation, bessere Beratung für Sie.'],
      ['Rechtsgrundlage', 'Erforderlichkeit zur Leistungserbringung und gesetzliche Pflichten. Für Werbenachrichten (Aktionen, Glückwünsche) holen wir Ihre gesonderte Einwilligung ein.'],
      ['Weitergabe', 'Ihre Daten können zur Leistungserbringung an die Softwaredienstleister unseres Salons (Cloud-Infrastruktur) übermittelt werden; an Dritte werden sie nur bei gesetzlicher Pflicht weitergegeben.'],
      ['Ihre Rechte', 'Auskunft, Berichtigung, Löschung und Widerspruch können Sie bei unserem Salon geltend machen.'],
      ['Einwilligung zu Werbenachrichten', 'Werbenachrichten (Aktionen, Glückwünsche, Angebote) außer Terminerinnerungen senden wir nur mit Ihrer Einwilligung.']
    ] }
  },
  en: {
    sartlar: { ad: 'Terms of use', metin: [
      ['1. Parties and subject', 'These terms govern the use of the LUMIO SALON application between "{S}" (the "Provider") and the salon using the application (the "Salon"). LUMIO SALON is a cloud-based software service for appointments, cash register, stock, customer records and team management.'],
      ['2. Account and authority', 'The Salon confirms that the person using the account is authorised to act on its behalf. User roles (manager, senior, partner, secretary, stylist) are set by the Salon. The user is responsible for keeping the password confidential.'],
      ['3. Licence and fees', 'The service is provided for a trial period and then for the licence period. When the period ends, new entries cannot be made; existing data is kept for {M} months afterwards. Price, term and refund conditions are communicated to the Salon in writing at the time of sale (e.g. via WhatsApp).'],
      ['4. Obligations of the Salon', 'The Salon is responsible for processing its customers\' personal data in accordance with applicable law, providing the required information and obtaining customers\' consent where necessary. The content of WhatsApp messages sent through the application and the suitability of recipients are the Salon\'s responsibility.'],
      ['5. Nature of the service', 'Calculations in the application (earnings, commission, profit, stock) are based on data entered by the Salon and are for information only; they do not replace accounting, tax or legal documents. The AI advisor gives general information and ideas; it is not definitive medical, legal or financial advice.'],
      ['6. Interruptions and liability', 'The service is provided "as is". For damage caused by maintenance, internet outages or third-party outages (Google/Firebase, Cloudflare, etc.), the Provider\'s liability is, to the extent permitted by law, limited to the licence fee paid by the Salon in the last 12 months.'],
      ['7. Termination', 'Either party may end the agreement by notice. On termination the Salon may request an export of its data; the data is deleted or anonymised after {M} months.'],
      ['8. Governing law', 'Unless the parties agree otherwise in writing, Turkish law applies; courts at the Provider\'s place of business have jurisdiction.'],
      ['9. Contact', '{S} · {I}']
    ] },
    gizlilik: { ad: 'Privacy and personal data', metin: [
      ['1. Data controller', 'For the account data of users and the salon, the controller is {S} ({I}). For data about the salon\'s customers, the controller is the salon concerned; the Provider acts only as a processor.'],
      ['2. Data processed', 'User: name, phone number, role, password (encrypted), activity log. Salon: salon name, service, product, stock and cash records. Salon customers (entered by the salon): name, phone, date of birth, appointment and treatment history, formula and note data.'],
      ['3. Purpose and legal basis', 'Providing the service, account security, licence management, support and compliance with legal obligations. Legal bases: performance of a contract, legal obligation and legitimate interest, under applicable law (e.g. GDPR in the EU, KVKK in Turkey, the Law "On Personal Data and Their Protection" in Kazakhstan, the Law "On Personal Data" in Uzbekistan).'],
      ['4. Transfers', 'To provide the service, data is transferred to cloud infrastructure providers (Google Firebase, Cloudflare); their servers may be located abroad. By using the application you agree to this transfer.'],
      ['5. Retention', 'Data is kept for the duration of the service and the statutory retention periods; afterwards it is deleted, destroyed or anonymised.'],
      ['6. Your rights', 'You have the right to know whether your data is processed, to request information, correction or deletion, to object, and to claim compensation for damage. Requests: {I}.'],
      ['7. Security', 'Data is transmitted over an encrypted connection (HTTPS); access is restricted by role-based permissions.'],
      ['8. Advisor questions', 'Questions asked to the Advisor that have no answer in the FAQ may be stored to improve the service without any identity, salon or user information (question text and language only). Please do not put personal data in such questions.'],
      ['9. Photo analysis', 'In salons with the Sales and Analysis package, a photo taken with the client\'s consent is sent only for analysis to the AI service provider (Google and/or Anthropic, which may be located abroad); it is not stored in the app or on the server. What is stored: the analysis date, type, recommended products and the fact that the client gave consent. The salon is responsible for obtaining this consent. Suggestions are cosmetic, not a medical diagnosis. The salon is responsible for the products and sellers behind purchase links.']
    ] },
    musteri: { ad: 'Customer data notice (template for your salon)', metin: [
      ['Data controller', '{SALON} (address: [SALON ADDRESS], phone: [SALON PHONE]).'],
      ['Data processed', 'Name, phone number, date of birth (if you provide it), appointment and treatment history, notes and formulas for treatments performed.'],
      ['Purpose', 'Booking and reminding you of your appointment, providing the service, handling payment and records, serving you better.'],
      ['Legal basis', 'Necessity for providing the service and legal obligations. For promotional messages (campaigns, birthday greetings) we ask for your separate consent.'],
      ['Transfers', 'Your data may be transferred, for the purpose of the service, to the software providers our salon uses (cloud infrastructure); it is not shared with third parties except where required by law.'],
      ['Your rights', 'You can exercise your rights to information, correction, deletion and objection by contacting our salon.'],
      ['Consent to promotional messages', 'Promotional messages (campaigns, birthday greetings, offers) other than appointment reminders are sent only if you consent.']
    ] }
  }
};
