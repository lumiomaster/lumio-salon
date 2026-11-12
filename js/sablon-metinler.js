// Müşteri ve usta mesajlarının hazır metinleri: Türkçe metinler mesaj.js içindedir; burada diğer diller.
export const USTA_SATIR_ON = { tr: '💇 Uzmanımız: ', ru: '💇 Ваш мастер: ', kk: '💇 Сіздің шебер: ', de: '💇 Ihr Stylist: ', en: '💇 Your stylist: ' };

export const SABLON_DIL = {
  ru: {
    odul: "Здравствуйте, {MUSTERI_ADI}! 🎁\n\nСпасибо, что выбираете {SALON_ADI}! За вашу лояльность вы получили скидку {ODUL} на следующий визит.\n\nЧтобы записаться, просто напишите в ответ на это сообщение. Будем рады видеть вас снова 🌸\n\n{IMZA}",
    takip: "📅 Здравствуйте, {MUSTERI_ADI}!\n\nПрошло некоторое время с вашего последнего визита, поэтому мы хотим помочь вам спланировать следующую запись 🌸\n\n⏰ Планируемая дата: {TARIH}\n{USTA_SATIR}\n📞 Чтобы подтвердить запись, достаточно ответить на это сообщение.\n\nПриятных дней! ✨\n{IMZA}",
    dogum: "С днём рождения, {MUSTERI_ADI}! 🎂🎉\n\nОт всей команды {SALON_ADI} желаем вам здоровья, спокойствия и много сияния в новом году жизни. 🌸\n\n🎁 Вас ждёт приятный подарок — особый уход в нашем салоне! Не забудьте записаться.\n\nС теплом,\n{IMZA}",
    davet: "Здравствуйте, {MUSTERI_ADI}! ☕🌸\n\nВ салоне {SALON_ADI} мы уже давно вас не видели и очень скучаем!\n\nЖдём вас, чтобы вернуть вашему образу заслуженное сияние и просто приятно отдохнуть за чашкой горячего кофе. ✨\n\nЧтобы вместе подобрать удобные день и время, достаточно ответить на это сообщение.\n\nКрасоты и тепла вам,\n{IMZA}",
    onay: "Здравствуйте, {MUSTERI_ADI}! ✨\n\n🗓️ Дата: {TARIH}\n⏰ Время: {SAAT}\n💇 Услуга: {HIZMET}\n\nВаша запись успешно оформлена. Если ваши планы изменятся, пожалуйста, предупредите нас заранее. 🙏\n\nС нетерпением ждём вас!\n{IMZA}",
    hatirlatma: "Здравствуйте, {MUSTERI_ADI}! ⏰\n\nНапоминаем о вашей записи на завтра:\n\n🗓️ Дата: {TARIH}\n⏰ Время: {SAAT}\n💇 Услуга: {HIZMET}\n{USTA_SATIR}\nЕсли не сможете прийти, пожалуйста, предупредите заранее 🙏\n\nДо встречи!\n{IMZA}",
    puan: "Здравствуйте, {MUSTERI_ADI}! 💛\n\nСпасибо, что выбрали наш салон. Надеемся, вам нравится ваш новый образ!\n\n⭐ Будем очень рады, если вы уделите 30 секунд и оцените нас в Google по ссылке ниже, оставив отзыв:\n{GOOGLE_LINK}\n\n{IMZA}",
    memnuniyet: "Здравствуйте, {MUSTERI_ADI}! ✨\n\nНадеемся, вы остались довольны последней услугой. Если у вас есть вопросы или пожелания, напишите в ответ на это сообщение; ваше мнение очень важно для нас.\n\n📸 Не забудьте подписаться на наш Instagram:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    instagram: "Здравствуйте, {MUSTERI_ADI}! ✨\n\n🎁 Чтобы быть в курсе новых трендов салона и участвовать в наших розыгрышах и подарках, ставьте лайки, комментируйте и подписывайтесь на наш Instagram!\n\n📸 Наш профиль в Instagram:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    iban: "Здравствуйте, {MUSTERI_ADI}! 🌸\n\nОплату можно безопасно перевести на наш банковский счёт:\n\n🏦 Банк: {BANKA_ADI}\n👤 Получатель: {HESAP_SAHIBI}\n💳 IBAN / счёт / номер карты: {IBAN_NO}\n\nПосле оплаты, пожалуйста, сообщите нам. Хорошего дня! ✨\n{IMZA}",
    mutabakatUst: "Здравствуйте, {USTA_ADI} 👋\n\n📅 Ваш расчёт за {TARIH}:",
    tesvik: "Сегодня у вас нет продаж товаров. Попробуйте предлагать каждому клиенту после процедуры средство для домашнего ухода; даже небольшое предложение помогает и волосам/коже клиента, и вашему заработку 💪",
    tebrik: "🎉 Поздравляем, сегодня вы продали товар!",
    mutabakatAlt: "✅ Если всё верно, нажмите в приложении на главной странице кнопку «Подтверждаю»; если есть ошибка, нажмите «У меня есть возражение».\n\n{IMZA}",
    siparis: "Здравствуйте! Мы хотим сделать заказ для {SALON_ADI}:\n\n{LISTE}\n\nСпасибо."
  },
  kk: {
    odul: "Сәлеметсіз бе, {MUSTERI_ADI}! 🎁\n\n{SALON_ADI} салонын таңдағаныңыз үшін рахмет! Адалдығыңыз үшін келесі келгеніңізде {ODUL} жеңілдік құқығына ие болдыңыз.\n\nЖазылу үшін осы хабарламаға жауап жазыңыз. Сізді қайта көруге қуаныштымыз 🌸\n\n{IMZA}",
    takip: "📅 Сәлеметсіз бе, {MUSTERI_ADI}!\n\nСоңғы келгеніңізге біраз уақыт өтті, келесі жазылу уақытын жоспарлауға көмектескіміз келеді 🌸\n\n⏰ Жоспарланған күн: {TARIH}\n{USTA_SATIR}\n📞 Жазылуды нақтылау үшін осы хабарламаға жауап жазсаңыз жеткілікті.\n\nӘдемі күндер тілейміз! ✨\n{IMZA}",
    dogum: "Туған күніңіз құтты болсын, {MUSTERI_ADI}! 🎂🎉\n\n{SALON_ADI} ұжымы атынан жаңа жасыңыз денсаулық, тыныштық және нұр әкелсін деп тілейміз. 🌸\n\n🎁 Салонымызда сізді туған күніңізге арналған арнайы күтім сыйлығы күтіп тұр! Жазылуды ұмытпаңыз.\n\nІзгі тілекпен,\n{IMZA}",
    davet: "Сәлеметсіз бе, {MUSTERI_ADI}! ☕🌸\n\n{SALON_ADI} салонында сізді көрмегенімізге көп болды, сағындық!\n\nӨзіңізге лайықты нұрды қайтарып, бір кесе ыстық кофе ішіп демалу үшін сізді күтеміз. ✨\n\nЫңғайлы күн мен уақытты бірге таңдау үшін осы хабарламаға жауап жазсаңыз жеткілікті.\n\nСұлулық пен жылулықпен,\n{IMZA}",
    onay: "Сәлеметсіз бе, {MUSTERI_ADI}! ✨\n\n🗓️ Күні: {TARIH}\n⏰ Уақыты: {SAAT}\n💇 Қызмет: {HIZMET}\n\nЖазылуыңыз сәтті рәсімделді. Жоспарыңыз өзгерсе, алдын ала хабарлауыңызды сұраймыз. 🙏\n\nСізді күтеміз!\n{IMZA}",
    hatirlatma: "Сәлеметсіз бе, {MUSTERI_ADI}! ⏰\n\nЕртеңгі жазылуыңызды еске саламыз:\n\n🗓️ Күні: {TARIH}\n⏰ Уақыты: {SAAT}\n💇 Қызмет: {HIZMET}\n{USTA_SATIR}\nКеле алмасаңыз, алдын ала хабарлаңыз 🙏\n\nКездескенше!\n{IMZA}",
    puan: "Сәлеметсіз бе, {MUSTERI_ADI}! 💛\n\nСалонымызды таңдағаныңыз үшін рахмет. Жаңа келбетіңіз ұнады деп үміттенеміз!\n\n⭐ 30 секунд уақыт бөліп, төмендегі сілтеме арқылы Google-да бағалап, пікіріңізді қалдырсаңыз, өте қуанамыз:\n{GOOGLE_LINK}\n\n{IMZA}",
    memnuniyet: "Сәлеметсіз бе, {MUSTERI_ADI}! ✨\n\nСоңғы қызметімізге риза болдыңыз деп үміттенеміз. Сұрағыңыз немесе тілегіңіз болса, осы хабарламаға жазыңыз; пікіріңіз біз үшін өте маңызды.\n\n📸 Instagram парақшамызға жазылуды ұмытпаңыз:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    instagram: "Сәлеметсіз бе, {MUSTERI_ADI}! ✨\n\n🎁 Салонымыздың жаңа трендтерін біліп, сыйлықтар мен ұтыс ойындарына қатысу үшін Instagram парақшамызға лайк басып, пікір қалдырып, жазылыңыз!\n\n📸 Instagram профилімізге сілтеме:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    iban: "Сәлеметсіз бе, {MUSTERI_ADI}! 🌸\n\nТөлемді төмендегі банк шотымызға сенімді түрде аудара аласыз:\n\n🏦 Банк: {BANKA_ADI}\n👤 Шот иесі: {HESAP_SAHIBI}\n💳 IBAN / шот / карта нөмірі: {IBAN_NO}\n\nТөлемнен кейін хабарлауыңызды сұраймыз. Жақсы күн тілейміз! ✨\n{IMZA}",
    mutabakatUst: "Сәлеметсіз бе, {USTA_ADI} 👋\n\n📅 {TARIH} күнгі есебіңіз:",
    tesvik: "Бүгін сізде тауар сатылымы жоқ. Әр клиентке процедурадан кейін үйде қолданатын құрал ұсынып көріңіз; шағын ұсыныс та клиенттің шашына/теріне де, сіздің табысыңызға да көмектеседі 💪",
    tebrik: "🎉 Құттықтаймыз, бүгін тауар саттыңыз!",
    mutabakatAlt: "✅ Дұрыс болса, қосымшаның басты бетіндегі «Растаймын» батырмасын басыңыз; қателік болса, «Қарсылығым бар» деңіз.\n\n{IMZA}",
    siparis: "Сәлеметсіз бе! {SALON_ADI} үшін тапсырыс бергіміз келеді:\n\n{LISTE}\n\nРахмет."
  },
  de: {
    odul: "Guten Tag {MUSTERI_ADI}! 🎁\n\nVielen Dank, dass Sie sich für {SALON_ADI} entscheiden! Als Dank für Ihre Treue erhalten Sie bei Ihrem nächsten Besuch {ODUL} Rabatt.\n\nFür einen Termin antworten Sie einfach auf diese Nachricht. Wir freuen uns auf Sie 🌸\n\n{IMZA}",
    takip: "📅 Guten Tag {MUSTERI_ADI},\n\nIhr letzter Besuch liegt schon etwas zurück. Gerne helfen wir Ihnen, Ihren nächsten Termin zu planen 🌸\n\n⏰ Geplanter Termin: {TARIH}\n{USTA_SATIR}\n📞 Antworten Sie einfach auf diese Nachricht, um den Termin zu bestätigen.\n\nWir wünschen Ihnen schöne Tage! ✨\n{IMZA}",
    dogum: "Alles Gute zum Geburtstag, {MUSTERI_ADI}! 🎂🎉\n\nIhr Team von {SALON_ADI} wünscht Ihnen Gesundheit, Ruhe und viel Glanz im neuen Lebensjahr. 🌸\n\n🎁 In unserem Salon wartet eine besondere Pflege als Geschenk auf Sie! Vergessen Sie nicht, einen Termin zu vereinbaren.\n\nHerzliche Grüße\n{IMZA}",
    davet: "Guten Tag {MUSTERI_ADI}! ☕🌸\n\nIhr Team von {SALON_ADI} hat Sie lange nicht gesehen und vermisst Sie!\n\nWir freuen uns, Ihnen wieder den verdienten Glanz zu schenken und Ihnen bei einer Tasse Kaffee eine schöne Auszeit zu bieten. ✨\n\nAntworten Sie einfach auf diese Nachricht, dann finden wir gemeinsam Tag und Uhrzeit.\n\nBleiben Sie schön und herzlich gegrüßt\n{IMZA}",
    onay: "Guten Tag {MUSTERI_ADI}! ✨\n\n🗓️ Datum: {TARIH}\n⏰ Uhrzeit: {SAAT}\n💇 Leistung: {HIZMET}\n\nIhr Termin wurde erfolgreich gebucht. Falls sich Ihre Pläne ändern, geben Sie uns bitte rechtzeitig Bescheid. 🙏\n\nWir freuen uns auf Sie!\n{IMZA}",
    hatirlatma: "Guten Tag {MUSTERI_ADI}! ⏰\n\nWir erinnern Sie an Ihren Termin morgen:\n\n🗓️ Datum: {TARIH}\n⏰ Uhrzeit: {SAAT}\n💇 Leistung: {HIZMET}\n{USTA_SATIR}\nFalls Sie nicht kommen können, sagen Sie bitte rechtzeitig ab 🙏\n\nBis bald!\n{IMZA}",
    puan: "Guten Tag {MUSTERI_ADI}! 💛\n\nVielen Dank, dass Sie sich für unseren Salon entschieden haben. Wir hoffen, Ihnen gefällt Ihr neuer Look!\n\n⭐ Wir würden uns sehr freuen, wenn Sie sich 30 Sekunden Zeit nehmen und uns über den folgenden Link bei Google bewerten:\n{GOOGLE_LINK}\n\n{IMZA}",
    memnuniyet: "Guten Tag {MUSTERI_ADI}! ✨\n\nWir hoffen, Sie waren mit unserer letzten Leistung zufrieden. Bei Fragen oder Wünschen schreiben Sie uns gerne auf diese Nachricht; Ihre Meinung ist uns sehr wichtig.\n\n📸 Folgen Sie auch unserer Instagram-Seite:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    instagram: "Guten Tag {MUSTERI_ADI}! ✨\n\n🎁 Um keine Trends unseres Salons zu verpassen und an Verlosungen und Geschenken teilzunehmen, liken, kommentieren und folgen Sie unserer Instagram-Seite!\n\n📸 Unser Instagram-Profil:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    iban: "Guten Tag {MUSTERI_ADI}! 🌸\n\nSie können die Zahlung sicher auf unser Bankkonto überweisen:\n\n🏦 Bank: {BANKA_ADI}\n👤 Kontoinhaber: {HESAP_SAHIBI}\n💳 IBAN / Konto / Kartennummer: {IBAN_NO}\n\nBitte geben Sie uns nach der Zahlung kurz Bescheid. Einen schönen Tag! ✨\n{IMZA}",
    mutabakatUst: "Hallo {USTA_ADI} 👋\n\n📅 Ihre Abrechnung für den {TARIH}:",
    tesvik: "Heute haben Sie keine Produkte verkauft. Empfehlen Sie jedem Kunden nach der Behandlung ein Pflegeprodukt für zu Hause; schon eine kleine Empfehlung hilft Haar/Haut des Kunden und Ihrem Verdienst 💪",
    tebrik: "🎉 Glückwunsch, Sie haben heute ein Produkt verkauft!",
    mutabakatAlt: "✅ Wenn alles stimmt, tippen Sie in der App auf der Startseite auf „Ich bestätige“; bei einem Fehler auf „Ich widerspreche“.\n\n{IMZA}",
    siparis: "Guten Tag, wir möchten für {SALON_ADI} bestellen:\n\n{LISTE}\n\nVielen Dank."
  },
  en: {
    odul: "Hello {MUSTERI_ADI}! 🎁\n\nThank you for choosing {SALON_ADI}! As a thank-you for your loyalty you have earned {ODUL} off your next visit.\n\nTo book, just reply to this message. We look forward to seeing you again 🌸\n\n{IMZA}",
    takip: "📅 Hello {MUSTERI_ADI},\n\nIt has been a while since your last visit, so we would like to help you plan your next appointment 🌸\n\n⏰ Planned date: {TARIH}\n{USTA_SATIR}\n📞 Just reply to this message to confirm your appointment.\n\nHave a lovely day! ✨\n{IMZA}",
    dogum: "Happy Birthday, {MUSTERI_ADI}! 🎂🎉\n\nEveryone at {SALON_ADI} wishes you health, peace and lots of sparkle in your new year. 🌸\n\n🎁 A special treatment is waiting for you at our salon as a birthday gift! Don't forget to book your appointment.\n\nWarm wishes,\n{IMZA}",
    davet: "Hello {MUSTERI_ADI}! ☕🌸\n\nWe at {SALON_ADI} haven't seen you for a while and we miss you!\n\nCome and enjoy a refreshed look and a relaxing break with a warm coffee. ✨\n\nJust reply to this message and we will find the best day and time together.\n\nStay beautiful,\n{IMZA}",
    onay: "Hello {MUSTERI_ADI}! ✨\n\n🗓️ Date: {TARIH}\n⏰ Time: {SAAT}\n💇 Service: {HIZMET}\n\nYour appointment has been booked successfully. If your plans change, please let us know in advance. 🙏\n\nWe look forward to seeing you!\n{IMZA}",
    hatirlatma: "Hello {MUSTERI_ADI}! ⏰\n\nA reminder of your appointment tomorrow:\n\n🗓️ Date: {TARIH}\n⏰ Time: {SAAT}\n💇 Service: {HIZMET}\n{USTA_SATIR}\nIf you cannot make it, please let us know in advance 🙏\n\nSee you soon!\n{IMZA}",
    puan: "Hello {MUSTERI_ADI}! 💛\n\nThank you for choosing our salon. We hope you love your new look!\n\n⭐ We would be delighted if you could take 30 seconds to rate us on Google and share your feedback using the link below:\n{GOOGLE_LINK}\n\n{IMZA}",
    memnuniyet: "Hello {MUSTERI_ADI}! ✨\n\nWe hope you were happy with your last service. If you have any questions or requests, feel free to reply to this message; your opinion matters a lot to us.\n\n📸 Don't forget to follow us on Instagram:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    instagram: "Hello {MUSTERI_ADI}! ✨\n\n🎁 To stay up to date with our latest trends and join our giveaways, like, comment and follow our Instagram page!\n\n📸 Our Instagram profile:\n{INSTAGRAM_LINK}\n\n{IMZA}",
    iban: "Hello {MUSTERI_ADI}! 🌸\n\nYou can safely pay by transfer to our bank account:\n\n🏦 Bank: {BANKA_ADI}\n👤 Account holder: {HESAP_SAHIBI}\n💳 IBAN / account / card no: {IBAN_NO}\n\nPlease let us know once you have paid. Have a great day! ✨\n{IMZA}",
    mutabakatUst: "Hello {USTA_ADI} 👋\n\n📅 Your statement for {TARIH}:",
    tesvik: "You have no product sales today. Try recommending a home-care product to every client after their service; even a small suggestion helps the client's hair/skin and your earnings 💪",
    tebrik: "🎉 Congratulations, you sold a product today!",
    mutabakatAlt: "✅ If everything is correct, tap “I confirm” on the app's home page; if something is wrong, tap “I object”.\n\n{IMZA}",
    siparis: "Hello, we would like to place an order for {SALON_ADI}:\n\n{LISTE}\n\nThank you."
  }
};
