// Salon sahibine WhatsApp ile gidecek giriş bilgisi ve kabul hatırlatma mesajları (5 dil).
// Not: yalnız "iki parçalı" (astral) emojiler kullanılır; bazı cihazlarda tek parçalı semboller (✨ ✅ ⚠) bozuk görünebiliyor.
const M = {
  tr: {
    giris: (v) => `LUMIO SALON'a hoş geldiniz! 🌟

Sayın ${v.sahip},
${v.salon} için hesabınız hazır.

📲 GİRİŞ BİLGİLERİNİZ
🌐 Uygulama: ${v.adres}
📞 Telefon: ${v.tel}
🔑 Geçici şifre: ${v.sifre}${v.gun ? `\n📅 Süreniz: ${v.gun} gün` : ''}

🔒 Şifrenizi kimseyle paylaşmayın. Giriş yaptıktan sonra Ayarlar bölümünden değiştirin.

🍎 iPHONE KURULUMU
1. Adresi Safari'de açın (WhatsApp içinden açtıysanız sağ alttaki pusula/Safari simgesine basın).
2. Alttaki "Paylaş" simgesine (kareden yukarı çıkan ok) dokunun.
3. "Ana Ekrana Ekle"yi seçip "Ekle"ye basın.
👉 iPhone'da bildirimler yalnız ana ekrandaki simgeden açınca çalışır.

🤖 ANDROID KURULUMU
1. Adresi Chrome'da açın.
2. Sağ üstteki üç nokta (⋮) simgesine dokunun.
3. "Uygulamayı yükle" veya "Ana ekrana ekle"yi seçin.

🔔 BİLDİRİMLER
Ana ekrandaki LUMIO simgesinden girin > Ayarlar > "Bildirimleri aç" > çıkan soruda "İzin ver". Yeni randevu ve ekip mesajları telefonunuza böyle gelir. İzin vermediyseniz telefon ayarlarından bu uygulamanın bildirimlerini açın.

📲 BAŞLANGIÇ
Ana ekrandaki simgeye dokunun, telefon ve şifrenizi bir kez girin; sistem sizi hatırlar. İlk girişte kullanım şartlarını okuyup "Okudum, anladım, kabul ediyorum" diyeceksiniz.

Bol kazançlar dileriz! 🌸
LUMIO SALON Destek Ekibi`,
    kabul: (v) => `Merhaba ${v.sahip}, ${v.salon} için LUMIO SALON'a girdiğinizde ilk ekranda kullanım şartlarını ve gizlilik metnini okuyup "Okudum, anladım, kabul ediyorum" kutusunu işaretleyip devam etmeniz gerekiyor. Kabul etmeden uygulamayı kullanamazsınız. Takıldığınız yerde bana yazabilirsiniz. 🌸`,
    hatirlat: (v) => `Merhaba ${v.sahip},

LUMIO SALON kullanım süreniz ${v.kalan > 0 ? 'tamamlanmasına ' + v.kalan + ' gün kaldı' : 'sona erdi'}. 🌟

Randevularınız, kasanız, ekibiniz ve müşteri kayıtlarınız hazır; hiçbir verinizi kaybetmeden kaldığınız yerden devam edebilirsiniz. Lisansınızı şimdi alarak kesintisiz çalışmaya devam edin, size en uygun paketi hemen ayarlayalım. 🙏

Bu mesaja "evet" yazmanız yeterli, gerisini biz hallederiz.

LUMIO SALON Lisans Yönetimi`
  },
  ru: {
    giris: (v) => `Добро пожаловать в LUMIO SALON! 🌟

Уважаемый(ая) ${v.sahip},
ваш аккаунт для «${v.salon}» готов.

📲 ВАШИ ДАННЫЕ ДЛЯ ВХОДА
🌐 Приложение: ${v.adres}
📞 Телефон: ${v.tel}
🔑 Временный пароль: ${v.sifre}${v.gun ? `\n📅 Срок: ${v.gun} дн.` : ''}

🔒 Никому не сообщайте пароль. После входа смените его в разделе «Настройки».

🍎 УСТАНОВКА НА iPHONE
1. Откройте ссылку в Safari (если открыли из WhatsApp — нажмите значок компаса/Safari справа внизу).
2. Нажмите значок «Поделиться» внизу (квадрат со стрелкой вверх).
3. Выберите «На экран “Домой”» и нажмите «Добавить».
👉 На iPhone уведомления работают, только если открывать приложение с иконки на главном экране.

🤖 УСТАНОВКА НА ANDROID
1. Откройте ссылку в Chrome.
2. Нажмите три точки (⋮) справа вверху.
3. Выберите «Установить приложение» или «Добавить на главный экран».

🔔 УВЕДОМЛЕНИЯ
Откройте LUMIO с иконки на главном экране > Настройки > «Включить уведомления» > в появившемся окне нажмите «Разрешить». Так вы будете получать новые записи и сообщения команды. Если вы не разрешили, включите уведомления для приложения в настройках телефона.

📲 НАЧАЛО РАБОТЫ
Нажмите на иконку на главном экране, один раз введите телефон и пароль — система вас запомнит. При первом входе нужно прочитать условия использования и нажать «Прочитал(а), понял(а), принимаю».

Желаем хорошего заработка! 🌸
Служба поддержки LUMIO SALON`,
    kabul: (v) => `Здравствуйте, ${v.sahip}! При первом входе в LUMIO SALON для «${v.salon}» на первом экране нужно прочитать условия использования и политику конфиденциальности, отметить «Прочитал(а), понял(а), принимаю» и продолжить. Без этого приложением пользоваться нельзя. Если что-то непонятно — пишите мне. 🌸`,
    hatirlat: (v) => `Здравствуйте, ${v.sahip}!

${v.kalan > 0 ? 'До окончания срока использования LUMIO SALON осталось ' + v.kalan + ' дн.' : 'Срок использования LUMIO SALON истёк.'} 🌟

Ваши записи, касса, команда и база клиентов готовы; вы можете продолжить с того места, где остановились, не потеряв ни одного данного. Оформите лицензию сейчас и работайте без перерыва — мы сразу подберём для вас подходящий пакет. 🙏

Достаточно ответить «да», остальное мы сделаем сами.

LUMIO SALON — управление лицензиями`
  },
  kk: {
    giris: (v) => `LUMIO SALON-ға қош келдіңіз! 🌟

Құрметті ${v.sahip},
«${v.salon}» үшін тіркелгіңіз дайын.

📲 КІРУ МӘЛІМЕТТЕРІҢІЗ
🌐 Қолданба: ${v.adres}
📞 Телефон: ${v.tel}
🔑 Уақытша құпия сөз: ${v.sifre}${v.gun ? `\n📅 Мерзімі: ${v.gun} күн` : ''}

🔒 Құпия сөзді ешкімге айтпаңыз. Кіргеннен кейін «Баптаулар» бөлімінде өзгертіңіз.

🍎 iPHONE-ҒА ОРНАТУ
1. Сілтемені Safari-де ашыңыз (WhatsApp ішінен ашсаңыз, оң жақ төменгі компас/Safari белгісін басыңыз).
2. Төмендегі «Бөлісу» белгісін (төртбұрыштан жоғары шыққан көрсеткі) басыңыз.
3. «Басты экранға қосу» таңдап, «Қосу» батырмасын басыңыз.
👉 iPhone-да хабарландырулар тек басты экрандағы белгіше арқылы ашқанда жұмыс істейді.

🤖 ANDROID-ҚА ОРНАТУ
1. Сілтемені Chrome-да ашыңыз.
2. Оң жақ жоғарыдағы үш нүктені (⋮) басыңыз.
3. «Қолданбаны орнату» немесе «Басты экранға қосу» таңдаңыз.

🔔 ХАБАРЛАНДЫРУЛАР
Басты экрандағы LUMIO белгішесі арқылы кіріңіз > Баптаулар > «Хабарландыруларды қосу» > шыққан сұрақта «Рұқсат ету» басыңыз. Осылайша жаңа жазылулар мен команда хабарламалары телефоныңызға келеді. Рұқсат бермесеңіз, телефон баптауларынан қолданбаның хабарландыруларын қосыңыз.

📲 БАСТАУ
Басты экрандағы белгішені басып, телефон мен құпия сөзді бір рет енгізіңіз — жүйе сізді есте сақтайды. Алғаш кіргенде пайдалану шарттарын оқып, «Оқыдым, түсіндім, қабылдаймын» деп белгілейсіз.

Табысты жұмыс тілейміз! 🌸
LUMIO SALON қолдау тобы`,
    kabul: (v) => `Сәлеметсіз бе, ${v.sahip}! «${v.salon}» үшін LUMIO SALON-ға алғаш кіргенде бірінші экранда пайдалану шарттары мен құпиялылық мәтінін оқып, «Оқыдым, түсіндім, қабылдаймын» деп белгілеп, жалғастыруыңыз керек. Онсыз қолданбаны пайдалану мүмкін емес. Түсініксіз жағдай болса, маған жазыңыз. 🌸`,
    hatirlat: (v) => `Сәлеметсіз бе, ${v.sahip}!

${v.kalan > 0 ? 'LUMIO SALON пайдалану мерзіміңіздің аяқталуына ' + v.kalan + ' күн қалды.' : 'LUMIO SALON пайдалану мерзіміңіз аяқталды.'} 🌟

Жазылулар, касса, команда және клиенттер базасы дайын; бірде-бір деректі жоғалтпай, тоқтаған жеріңізден жалғастыра аласыз. Лицензияны қазір алып, үзіліссіз жұмыс істеңіз — өзіңізге ыңғайлы пакетті бірден баптап береміз. 🙏

«Иә» деп жауап берсеңіз жеткілікті, қалғанын өзіміз жасаймыз.

LUMIO SALON — лицензияны басқару`
  },
  de: {
    giris: (v) => `Willkommen bei LUMIO SALON! 🌟

Guten Tag ${v.sahip},
Ihr Zugang für „${v.salon}" ist bereit.

📲 IHRE ZUGANGSDATEN
🌐 Anwendung: ${v.adres}
📞 Telefon: ${v.tel}
🔑 Vorläufiges Passwort: ${v.sifre}${v.gun ? `\n📅 Laufzeit: ${v.gun} Tage` : ''}

🔒 Geben Sie das Passwort nicht weiter. Ändern Sie es nach der Anmeldung unter „Einstellungen".

🍎 INSTALLATION AUF DEM iPHONE
1. Öffnen Sie den Link in Safari (aus WhatsApp: unten rechts auf das Kompass-/Safari-Symbol tippen).
2. Tippen Sie unten auf „Teilen" (Quadrat mit Pfeil nach oben).
3. Wählen Sie „Zum Home-Bildschirm" und tippen Sie auf „Hinzufügen".
👉 Auf dem iPhone funktionieren Benachrichtigungen nur, wenn Sie die App über das Symbol auf dem Home-Bildschirm öffnen.

🤖 INSTALLATION AUF ANDROID
1. Öffnen Sie den Link in Chrome.
2. Tippen Sie oben rechts auf die drei Punkte (⋮).
3. Wählen Sie „App installieren" oder „Zum Startbildschirm hinzufügen".

🔔 BENACHRICHTIGUNGEN
Öffnen Sie LUMIO über das Symbol auf dem Home-Bildschirm > Einstellungen > „Benachrichtigungen aktivieren" > bei der Abfrage „Zulassen". So erhalten Sie neue Termine und Team-Nachrichten. Falls Sie nicht zugelassen haben, aktivieren Sie die Benachrichtigungen in den Telefon-Einstellungen.

📲 START
Tippen Sie auf das Symbol, geben Sie Telefon und Passwort einmal ein — das System merkt sich Sie. Bei der ersten Anmeldung lesen Sie die Nutzungsbedingungen und bestätigen „Gelesen, verstanden, akzeptiert".

Viel Erfolg! 🌸
LUMIO SALON Support`,
    kabul: (v) => `Guten Tag ${v.sahip}, bei der ersten Anmeldung in LUMIO SALON für „${v.salon}" müssen Sie auf dem ersten Bildschirm die Nutzungsbedingungen und den Datenschutztext lesen, „Gelesen, verstanden, akzeptiert" ankreuzen und fortfahren. Ohne Zustimmung kann die Anwendung nicht genutzt werden. Bei Fragen schreiben Sie mir gern. 🌸`,
    hatirlat: (v) => `Guten Tag ${v.sahip},

${v.kalan > 0 ? 'Ihre Nutzungsdauer von LUMIO SALON endet in ' + v.kalan + ' Tagen.' : 'Ihre Nutzungsdauer von LUMIO SALON ist abgelaufen.'} 🌟

Ihre Termine, Kasse, Ihr Team und Ihre Kundendaten sind bereit; Sie machen ohne Datenverlust genau dort weiter, wo Sie aufgehört haben. Sichern Sie sich jetzt die Lizenz und arbeiten Sie ohne Unterbrechung weiter — wir stellen sofort das passende Paket für Sie ein. 🙏

Antworten Sie einfach mit „Ja", den Rest erledigen wir.

LUMIO SALON Lizenzverwaltung`
  },
  en: {
    giris: (v) => `Welcome to LUMIO SALON! 🌟

Dear ${v.sahip},
your account for "${v.salon}" is ready.

📲 YOUR LOGIN DETAILS
🌐 App: ${v.adres}
📞 Phone: ${v.tel}
🔑 Temporary password: ${v.sifre}${v.gun ? `\n📅 Duration: ${v.gun} days` : ''}

🔒 Do not share your password. After logging in, change it under Settings.

🍎 INSTALL ON iPHONE
1. Open the link in Safari (if opened from WhatsApp, tap the compass/Safari icon at the bottom right).
2. Tap the "Share" icon at the bottom (square with an arrow pointing up).
3. Choose "Add to Home Screen" and tap "Add".
👉 On iPhone, notifications only work when you open the app from the home-screen icon.

🤖 INSTALL ON ANDROID
1. Open the link in Chrome.
2. Tap the three dots (⋮) at the top right.
3. Choose "Install app" or "Add to Home screen".

🔔 NOTIFICATIONS
Open LUMIO from the home-screen icon > Settings > "Turn on notifications" > tap "Allow" when asked. This is how new appointments and team messages reach your phone. If you did not allow it, turn on notifications for this app in your phone settings.

📲 GETTING STARTED
Tap the icon on your home screen and enter your phone and password once; the system will remember you. On first login you will read the terms of use and confirm "I have read, understood and accept".

Wishing you great success! 🌸
LUMIO SALON Support Team`,
    kabul: (v) => `Hello ${v.sahip}, when you first log in to LUMIO SALON for "${v.salon}", on the first screen you need to read the terms of use and privacy text, tick "I have read, understood and accept" and continue. The app cannot be used without accepting. Message me if anything is unclear. 🌸`,
    hatirlat: (v) => `Hello ${v.sahip},

${v.kalan > 0 ? 'Your LUMIO SALON usage period ends in ' + v.kalan + ' days.' : 'Your LUMIO SALON usage period has ended.'} 🌟

Your appointments, cash register, team and customer records are ready; you can carry on where you left off without losing any data. Get your licence now and keep working without interruption — we will set up the right package for you straight away. 🙏

Just reply "yes" and we will take care of the rest.

LUMIO SALON Licence Management`
  }
};
export const MESAJ_DILLERI = ['tr', 'ru', 'kk', 'de', 'en'];
// Ülkeye göre varsayılan mesaj dili (yönetici değiştirebilir)
export const ULKE_DILI = { TR: 'tr', AZ: 'tr', KZ: 'ru', UZ: 'ru', KG: 'ru', RU: 'ru', DE: 'de', DIGER: 'en' };
export const girisMesajiYap = (dil, v) => (M[dil] || M.tr).giris(v);
export const hatirlatMesajiYap = (dil, v) => (M[dil] || M.tr).hatirlat(v);
export const kabulMesajiYap = (dil, v) => (M[dil] || M.tr).kabul(v);
