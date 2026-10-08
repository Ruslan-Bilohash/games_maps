
  // =====================================================================
  // Мови: українська, англійська, норвезька (букмол)
  // =====================================================================
  const LANGS = { uk: 'Українська', en: 'English', no: 'Norsk' };
  const I18N = {
    uk: {
      'doc.title': 'Двобій 3D', 'title.sub': '3D-бій на двох', 'load.txt': 'Завантажуємо бійців і арени…', 'load.arena': 'Будуємо арену…',
      'load.failModels': 'Не вдалося завантажити 3D-моделі: {e}', 'load.fail3d': 'Не вдалося запустити 3D-рушій', 'load.noWebgl': 'Цей браузер не підтримує 3D-графіку (WebGL). Спробуй Chrome або Safari та увімкни апаратне прискорення.',
      'nick.label': 'Твоє ім’я в бою', 'nick.ph': 'Наприклад, Сірко',
      'btn.camp': 'Проходження', 'btn.campCont': 'Продовжити проходження · бій {n} з {m}', 'btn.campChamp': 'Проходження · ти чемпіон',
      'btn.online': 'Бій онлайн', 'btn.qr': 'Бій за QR-кодом', 'btn.code': 'Ввести код', 'btn.cpu': 'Проти комп’ютера', 'btn.local': 'Удвох тут', 'btn.exit': 'Вийти з гри',
      'hint': 'Телефон: джойстик під лівим пальцем (вгору — стрибок, вниз — блок), удари праворуч. Клавіатура: A/D хід, W стрибок, S блок, J рука, K нога, L важкий, F сальто, U спец, I супер. Геймпад теж працює.',
      'select.title': 'Обери бійця', 'pick.arena': 'Арена', 'pick.diff': 'Складність', 'pick.random': 'Випадкова', 'diff.0': 'Легко', 'diff.1': 'Нормально', 'diff.2': 'Важко',
      'btn.back': 'Назад', 'btn.fight': 'До бою', 'btn.cancel': 'Скасувати', 'btn.menu': 'Меню',
      'lobby.search': 'Шукаємо суперника', 'lobby.wait': 'Чекаємо, поки ще хтось відкриє гру й натисне «Бій онлайн».', 'lobby.cpu': 'Поки що з комп’ютером', 'lobby.count': 'Зараз у грі: {a}. Шукають бій: {b}.',
      'lobby.unavail': 'Онлайн недоступний', 'lobby.unavailText': 'Бій онлайн працює, коли гра відкрита на claude.ai і ти увійшов в акаунт. Поки що можна битися з комп’ютером.',
      'lobby.joining': 'Підключаємося до друга', 'lobby.joinText': 'Код {c}. Чекаємо, поки друг тримає відкритим свій QR-екран.',
      'story.stage': 'Бій {n} з {m} · {arena}', 'story.vs': 'Суперник: {name} — {title}', 'story.boss': ' · у боса більше сил', 'story.mirror': ' Але цього разу проти тебе вийде твій власний двійник.',
      'qr.title': 'Бій за QR-кодом', 'qr.show': 'Покажи код другові', 'qr.text': 'Друг сканує QR камерою телефона, відкриває гру, натискає «Ввести код» і вводить ці літери. Бій почнеться сам.',
      'qr.textNo': 'Бій за кодом працює, коли гра відкрита на claude.ai і ти увійшов в акаунт.', 'qr.copy': 'Копіювати запрошення', 'qr.copied': 'Запрошення скопійовано', 'qr.invite': 'Бій у «Двобій 3D»! Відкрий {url}, натисни «Ввести код» і введи {code}', 'qr.unavail': 'QR недоступний',
      'code.title': 'Код друга', 'code.label': 'Літери під QR-кодом на екрані друга', 'code.ph': 'Наприклад, K7MQ2', 'code.len': 'Код має 5 символів', 'code.friend': 'Є код друга — обери бійця й тисни «До бою»',
      'lang.label': 'Мова', 'pause.title': 'Пауза', 'btn.resume': 'Продовжити', 'btn.resumeOnline': 'Повернутися до бою', 'btn.quit': 'Вийти з бою', 'sound.on': 'Звук: увімкнено', 'sound.off': 'Звук: вимкнено', 'music.on': 'Музика: увімкнено', 'music.off': 'Музика: вимкнено',
      'quality': 'Графіка: {q}', 'q.0': 'низька', 'q.1': 'середня', 'q.2': 'висока', 'q.3': 'ультра', 'lang': 'Мова',
      'credits': '3D-скан голови: Lee Perry-Smith, Infinite-Realities (CC BY 3.0). Персонажі: Adobe Mixamo. Рушій: three.js (MIT).',
      'res.win': 'Перемога', 'res.lose': 'Поразка', 'res.winner': 'Переміг {name}', 'res.winText': 'Ти здолав бійця «{name}» з рахунком {a}:{b}.', 'res.loseText': '«{name}» виявився сильнішим: {a}:{b}. Спробуй іншу тактику.',
      'res.localText': 'Рахунок {a}:{b}. Реванш?', 'res.oppLeft': 'Суперник покинув арену. Перемога твоя.', 'btn.again': 'Ще бій', 'btn.toMenu': 'У меню', 'btn.next': 'Наступний бій', 'btn.retry': 'Спробувати ще', 'btn.replay': 'Пройти знову',
      'camp.champTitle': 'Чемпіон турніру!', 'camp.champText': '{name} здолав усі сім арен і Чорного лицаря. Прогрес збережено.', 'camp.saved': ' Прогрес збережено: далі бій {n} з {m}.', 'camp.savedRetry': ' Прогрес збережено — спробуй ще раз.',
      'rotate.title': 'Поверни телефон горизонтально', 'rotate.sub': 'Гра зроблена для альбомного екрана', 'rotate.skip': 'Грати так',
      'round': 'Раунд {n}', 'fight': 'Бий!', 'ko': 'Нокаут', 'ko.won': 'ти переміг у раунді', 'ko.lost': 'ти програв раунд', 'ko.local': 'раунд за: {name}',
      'time': 'Час вийшов', 'time.you': 'у тебе більше сил', 'time.opp': 'у суперника більше сил', 'time.draw': 'нічия', 'finish': 'Фінальний удар!', 'victory': 'Перемога',
      'combo': 'комбо', 'combo.n': '{n} удари!', 'combo.3': 'Добре!', 'combo.4': 'Брутально!', 'combo.5': 'Неймовірно!', 'combo.6': 'Козацька міць!', 'combo.juggle': 'Жонглювання!',
      'cn.fists': 'Чотири кулаки', 'cn.hopak': 'Гопак', 'cn.storm': 'Буря ударів', 'cn.throw': 'Кидок через плече',
      'toast.found': 'Суперника знайдено: {nm}', 'toast.oppLeft': 'Суперник вийшов з бою', 'toast.pad': 'Геймпад підключено', 'toast.p2': 'Гравець 2: стрілки, «,» рука, «.» нога, «/» важкий, «;» сальто, «[» спец, «]» супер — або другий геймпад',
      'net.retry': 'Не вдалося з’єднатися. Шукаємо далі…', 'opp': 'Суперник', 'fighter': 'Боєць', 'p1': 'Гравець 1', 'p2': 'Гравець 2', 'cpu': ' (комп’ютер)', 'twin': 'Двійник {name}',
      'mode.online': 'Онлайн · ', 'mode.local': 'Удвох · ', 'mode.cpu': 'Проти комп’ютера · ', 'mode.camp': 'Проходження {n}/{m} · ',
      'mv.special': 'Спец', 'mv.super': 'Супер', 'mv.reload': 'Перезарядка {s} с.', 'mv.hands': 'Руки', 'mv.handsT': '«Рука» чотири рази: джеб, прямий, хук, апперкот. «Нога» тричі: удар, поштовх, Гопак із розвороту.',
      'mv.block': 'З блоком', 'mv.blockT': 'Блок + рука — апперкот, блок + нога — підсічка, блок + важкий біля суперника — кидок.', 'mv.flip': 'Сальто', 'mv.flipT': 'Саме — ухилення назад. З джойстиком до суперника — удар п’ятою згори.',
      'mv.air': 'У повітрі', 'mv.airT': 'У стрибку: рука або нога. Підкинутого апперкотом суперника можна добивати в повітрі.',
      'pad.p': 'Рука', 'pad.k': 'Нога', 'pad.h': 'Важкий', 'pad.block': 'Блок', 'pad.f': 'Сальто', 'pad.s': 'Спец', 'pad.u': 'Супер', 'pad.jump': 'Стрибок',
      'login.btn': 'Увійти через email', 'login.as': 'Ти увійшов як {e}', 'login.out': 'Вийти з акаунта', 'login.title': 'Вхід через email', 'login.text': 'Надішлемо код і посилання для входу. Проходження збережеться в акаунті й відкриється на будь-якому пристрої.',
      'login.email': 'Твій email', 'login.send': 'Надіслати код', 'login.code': 'Код із листа', 'login.verify': 'Увійти', 'login.sent': 'Лист надіслано на {e}. Введи код або натисни посилання в листі.',
      'login.bad': 'Невірний або прострочений код', 'login.err': 'Не вдалося: {e}', 'login.ok': 'Вхід виконано. Прогрес синхронізовано.', 'login.badEmail': 'Перевір адресу email', 'login.wait': 'Зачекай хвилину перед новим листом', 'login.synced': 'Прогрес збережено в акаунті'
    },
    en: {
      'doc.title': 'Duel 3D', 'title.sub': '3D two-player fighting', 'load.txt': 'Loading fighters and arenas…', 'load.arena': 'Building the arena…',
      'load.failModels': 'Could not load 3D models: {e}', 'load.fail3d': 'Could not start the 3D engine', 'load.noWebgl': 'This browser does not support 3D graphics (WebGL). Try Chrome or Safari and enable hardware acceleration.',
      'nick.label': 'Your fighter name', 'nick.ph': 'For example, Sirko',
      'btn.camp': 'Story mode', 'btn.campCont': 'Continue story · fight {n} of {m}', 'btn.campChamp': 'Story mode · you are the champion',
      'btn.online': 'Fight online', 'btn.qr': 'Fight via QR code', 'btn.code': 'Enter code', 'btn.cpu': 'Versus computer', 'btn.local': 'Two players here', 'btn.exit': 'Quit game',
      'hint': 'Phone: joystick under your left thumb (up — jump, down — block), attacks on the right. Keyboard: A/D move, W jump, S block, J punch, K kick, L heavy, F flip, U special, I super. Gamepads work too.',
      'select.title': 'Choose your fighter', 'pick.arena': 'Arena', 'pick.diff': 'Difficulty', 'pick.random': 'Random', 'diff.0': 'Easy', 'diff.1': 'Normal', 'diff.2': 'Hard',
      'btn.back': 'Back', 'btn.fight': 'Fight!', 'btn.cancel': 'Cancel', 'btn.menu': 'Menu',
      'lobby.search': 'Looking for an opponent', 'lobby.wait': 'Waiting for someone else to open the game and press “Fight online”.', 'lobby.cpu': 'Fight the computer meanwhile', 'lobby.count': 'Players now: {a}. Looking for a fight: {b}.',
      'lobby.unavail': 'Online unavailable', 'lobby.unavailText': 'Online fights work when the game is open on claude.ai and you are signed in. You can fight the computer for now.',
      'lobby.joining': 'Connecting to your friend', 'lobby.joinText': 'Code {c}. Waiting while your friend keeps the QR screen open.',
      'story.stage': 'Fight {n} of {m} · {arena}', 'story.vs': 'Opponent: {name} — {title}', 'story.boss': ' · the boss is stronger', 'story.mirror': ' But this time you will face your own double.',
      'qr.title': 'Fight via QR code', 'qr.show': 'Show this code to a friend', 'qr.text': 'Your friend scans the QR code with a phone camera, opens the game, taps “Enter code” and types these letters. The fight starts by itself.',
      'qr.textNo': 'Code fights work when the game is open on claude.ai and you are signed in.', 'qr.copy': 'Copy invitation', 'qr.copied': 'Invitation copied', 'qr.invite': 'Fight me in Duel 3D! Open {url}, tap “Enter code” and type {code}', 'qr.unavail': 'QR unavailable',
      'code.title': 'Friend’s code', 'code.label': 'Letters under the QR code on your friend’s screen', 'code.ph': 'For example, K7MQ2', 'code.len': 'The code has 5 characters', 'code.friend': 'You have a friend’s code — pick a fighter and press “Fight!”',
      'lang.label': 'Language', 'pause.title': 'Pause', 'btn.resume': 'Continue', 'btn.resumeOnline': 'Back to the fight', 'btn.quit': 'Leave fight', 'sound.on': 'Sound: on', 'sound.off': 'Sound: off', 'music.on': 'Music: on', 'music.off': 'Music: off',
      'quality': 'Graphics: {q}', 'q.0': 'low', 'q.1': 'medium', 'q.2': 'high', 'q.3': 'ultra', 'lang': 'Language',
      'credits': 'Head scan: Lee Perry-Smith, Infinite-Realities (CC BY 3.0). Characters: Adobe Mixamo. Engine: three.js (MIT).',
      'res.win': 'Victory', 'res.lose': 'Defeat', 'res.winner': '{name} wins', 'res.winText': 'You beat “{name}” {a}:{b}.', 'res.loseText': '“{name}” was stronger: {a}:{b}. Try another tactic.',
      'res.localText': 'Score {a}:{b}. Rematch?', 'res.oppLeft': 'Your opponent left the arena. The win is yours.', 'btn.again': 'Fight again', 'btn.toMenu': 'Main menu', 'btn.next': 'Next fight', 'btn.retry': 'Try again', 'btn.replay': 'Play again',
      'camp.champTitle': 'Tournament champion!', 'camp.champText': '{name} conquered all seven arenas and the Black Knight. Progress saved.', 'camp.saved': ' Progress saved: next is fight {n} of {m}.', 'camp.savedRetry': ' Progress saved — try again.',
      'rotate.title': 'Turn your phone sideways', 'rotate.sub': 'The game is made for landscape', 'rotate.skip': 'Play anyway',
      'round': 'Round {n}', 'fight': 'Fight!', 'ko': 'Knockout', 'ko.won': 'you won the round', 'ko.lost': 'you lost the round', 'ko.local': 'round to {name}',
      'time': 'Time up', 'time.you': 'you have more strength', 'time.opp': 'your opponent has more strength', 'time.draw': 'draw', 'finish': 'Final blow!', 'victory': 'Victory',
      'combo': 'combo', 'combo.n': '{n} hits!', 'combo.3': 'Good!', 'combo.4': 'Brutal!', 'combo.5': 'Incredible!', 'combo.6': 'Cossack fury!', 'combo.juggle': 'Juggle!',
      'cn.fists': 'Four Fists', 'cn.hopak': 'Hopak', 'cn.storm': 'Storm of Blows', 'cn.throw': 'Shoulder Throw',
      'toast.found': 'Opponent found: {nm}', 'toast.oppLeft': 'Your opponent left the fight', 'toast.pad': 'Gamepad connected', 'toast.p2': 'Player 2: arrows, “,” punch, “.” kick, “/” heavy, “;” flip, “[” special, “]” super — or a second gamepad',
      'net.retry': 'Could not connect. Still searching…', 'opp': 'Opponent', 'fighter': 'Fighter', 'p1': 'Player 1', 'p2': 'Player 2', 'cpu': ' (CPU)', 'twin': '{name}’s Double',
      'mode.online': 'Online · ', 'mode.local': 'Two players · ', 'mode.cpu': 'Versus CPU · ', 'mode.camp': 'Story {n}/{m} · ',
      'mv.special': 'Special', 'mv.super': 'Super', 'mv.reload': 'Recharge {s} s.', 'mv.hands': 'Punches', 'mv.handsT': 'Punch four times: jab, cross, hook, uppercut. Kick three times: kick, push kick, spinning Hopak.',
      'mv.block': 'With block', 'mv.blockT': 'Block + punch — uppercut, block + kick — sweep, block + heavy up close — throw.', 'mv.flip': 'Flip', 'mv.flipT': 'Alone — dodge backwards. Toward the opponent — heel drop from above.',
      'mv.air': 'In the air', 'mv.airT': 'While jumping: punch or kick. An opponent launched by an uppercut can be juggled in the air.',
      'pad.p': 'Punch', 'pad.k': 'Kick', 'pad.h': 'Heavy', 'pad.block': 'Block', 'pad.f': 'Flip', 'pad.s': 'Special', 'pad.u': 'Super', 'pad.jump': 'Jump',
      'login.btn': 'Sign in with email', 'login.as': 'Signed in as {e}', 'login.out': 'Sign out', 'login.title': 'Sign in with email', 'login.text': 'We will send a code and a sign-in link. Your story progress is saved to your account and opens on any device.',
      'login.email': 'Your email', 'login.send': 'Send code', 'login.code': 'Code from the email', 'login.verify': 'Sign in', 'login.sent': 'Email sent to {e}. Enter the code or tap the link in the email.',
      'login.bad': 'Wrong or expired code', 'login.err': 'Failed: {e}', 'login.ok': 'Signed in. Progress synced.', 'login.badEmail': 'Check the email address', 'login.wait': 'Wait a minute before requesting another email', 'login.synced': 'Progress saved to your account'
    },
    no: {
      'doc.title': 'Duell 3D', 'title.sub': '3D-kamp for to', 'load.txt': 'Laster inn kjempere og arenaer…', 'load.arena': 'Bygger arenaen…',
      'load.failModels': 'Kunne ikke laste 3D-modeller: {e}', 'load.fail3d': 'Kunne ikke starte 3D-motoren', 'load.noWebgl': 'Denne nettleseren støtter ikke 3D-grafikk (WebGL). Prøv Chrome eller Safari og slå på maskinvareakselerasjon.',
      'nick.label': 'Navnet ditt i kamp', 'nick.ph': 'For eksempel Sirko',
      'btn.camp': 'Historiemodus', 'btn.campCont': 'Fortsett historien · kamp {n} av {m}', 'btn.campChamp': 'Historiemodus · du er mester',
      'btn.online': 'Kjemp på nett', 'btn.qr': 'Kamp med QR-kode', 'btn.code': 'Skriv inn kode', 'btn.cpu': 'Mot datamaskinen', 'btn.local': 'To spillere her', 'btn.exit': 'Avslutt spillet',
      'hint': 'Mobil: styrespak under venstre tommel (opp — hopp, ned — blokk), angrep til høyre. Tastatur: A/D gå, W hopp, S blokk, J slag, K spark, L tungt, F salto, U spesial, I super. Spillkontroller fungerer også.',
      'select.title': 'Velg kjemper', 'pick.arena': 'Arena', 'pick.diff': 'Vanskelighet', 'pick.random': 'Tilfeldig', 'diff.0': 'Lett', 'diff.1': 'Normal', 'diff.2': 'Vanskelig',
      'btn.back': 'Tilbake', 'btn.fight': 'Til kamp', 'btn.cancel': 'Avbryt', 'btn.menu': 'Meny',
      'lobby.search': 'Ser etter motstander', 'lobby.wait': 'Venter på at noen andre åpner spillet og trykker «Kjemp på nett».', 'lobby.cpu': 'Mot datamaskinen så lenge', 'lobby.count': 'Spillere nå: {a}. Ser etter kamp: {b}.',
      'lobby.unavail': 'Nettkamp er ikke tilgjengelig', 'lobby.unavailText': 'Nettkamp fungerer når spillet er åpent på claude.ai og du er logget inn. Du kan kjempe mot datamaskinen så lenge.',
      'lobby.joining': 'Kobler til vennen din', 'lobby.joinText': 'Kode {c}. Venter mens vennen din holder QR-skjermen åpen.',
      'story.stage': 'Kamp {n} av {m} · {arena}', 'story.vs': 'Motstander: {name} — {title}', 'story.boss': ' · sjefen er sterkere', 'story.mirror': ' Men denne gangen møter du din egen dobbeltgjenger.',
      'qr.title': 'Kamp med QR-kode', 'qr.show': 'Vis koden til en venn', 'qr.text': 'Vennen skanner QR-koden med mobilkameraet, åpner spillet, trykker «Skriv inn kode» og skriver disse bokstavene. Kampen starter av seg selv.',
      'qr.textNo': 'Kamp med kode fungerer når spillet er åpent på claude.ai og du er logget inn.', 'qr.copy': 'Kopier invitasjon', 'qr.copied': 'Invitasjonen er kopiert', 'qr.invite': 'Kjemp mot meg i Duell 3D! Åpne {url}, trykk «Skriv inn kode» og skriv {code}', 'qr.unavail': 'QR er ikke tilgjengelig',
      'code.title': 'Vennens kode', 'code.label': 'Bokstavene under QR-koden på vennens skjerm', 'code.ph': 'For eksempel K7MQ2', 'code.len': 'Koden har 5 tegn', 'code.friend': 'Du har en kode fra en venn — velg kjemper og trykk «Til kamp»',
      'lang.label': 'Språk', 'pause.title': 'Pause', 'btn.resume': 'Fortsett', 'btn.resumeOnline': 'Tilbake til kampen', 'btn.quit': 'Forlat kampen', 'sound.on': 'Lyd: på', 'sound.off': 'Lyd: av', 'music.on': 'Musikk: på', 'music.off': 'Musikk: av',
      'quality': 'Grafikk: {q}', 'q.0': 'lav', 'q.1': 'middels', 'q.2': 'høy', 'q.3': 'ultra', 'lang': 'Språk',
      'credits': 'Hodeskanning: Lee Perry-Smith, Infinite-Realities (CC BY 3.0). Figurer: Adobe Mixamo. Motor: three.js (MIT).',
      'res.win': 'Seier', 'res.lose': 'Tap', 'res.winner': '{name} vinner', 'res.winText': 'Du slo «{name}» {a}:{b}.', 'res.loseText': '«{name}» var sterkere: {a}:{b}. Prøv en annen taktikk.',
      'res.localText': 'Stilling {a}:{b}. Revansj?', 'res.oppLeft': 'Motstanderen forlot arenaen. Seieren er din.', 'btn.again': 'Ny kamp', 'btn.toMenu': 'Til menyen', 'btn.next': 'Neste kamp', 'btn.retry': 'Prøv igjen', 'btn.replay': 'Spill igjen',
      'camp.champTitle': 'Turneringsmester!', 'camp.champText': '{name} beseiret alle sju arenaene og Den svarte ridderen. Fremgangen er lagret.', 'camp.saved': ' Fremgangen er lagret: neste er kamp {n} av {m}.', 'camp.savedRetry': ' Fremgangen er lagret — prøv igjen.',
      'rotate.title': 'Snu telefonen på siden', 'rotate.sub': 'Spillet er laget for liggende skjerm', 'rotate.skip': 'Spill likevel',
      'round': 'Runde {n}', 'fight': 'Kjemp!', 'ko': 'Knockout', 'ko.won': 'du vant runden', 'ko.lost': 'du tapte runden', 'ko.local': 'runden til {name}',
      'time': 'Tiden er ute', 'time.you': 'du har mer krefter', 'time.opp': 'motstanderen har mer krefter', 'time.draw': 'uavgjort', 'finish': 'Siste slag!', 'victory': 'Seier',
      'combo': 'kombo', 'combo.n': '{n} treff!', 'combo.3': 'Bra!', 'combo.4': 'Brutalt!', 'combo.5': 'Utrolig!', 'combo.6': 'Kosakkraft!', 'combo.juggle': 'Sjonglering!',
      'cn.fists': 'Fire never', 'cn.hopak': 'Hopak', 'cn.storm': 'Slagstorm', 'cn.throw': 'Skulderkast',
      'toast.found': 'Motstander funnet: {nm}', 'toast.oppLeft': 'Motstanderen forlot kampen', 'toast.pad': 'Spillkontroller tilkoblet', 'toast.p2': 'Spiller 2: piltaster, «,» slag, «.» spark, «/» tungt, «;» salto, «[» spesial, «]» super — eller en ekstra spillkontroller',
      'net.retry': 'Kunne ikke koble til. Leter videre…', 'opp': 'Motstander', 'fighter': 'Kjemper', 'p1': 'Spiller 1', 'p2': 'Spiller 2', 'cpu': ' (datamaskin)', 'twin': 'Dobbeltgjenger av {name}',
      'mode.online': 'På nett · ', 'mode.local': 'To spillere · ', 'mode.cpu': 'Mot datamaskinen · ', 'mode.camp': 'Historie {n}/{m} · ',
      'mv.special': 'Spesial', 'mv.super': 'Super', 'mv.reload': 'Lades på {s} s.', 'mv.hands': 'Slag', 'mv.handsT': 'Slag fire ganger: jab, rett, krok, uppercut. Spark tre ganger: spark, støtspark, snurrende hopak.',
      'mv.block': 'Med blokk', 'mv.blockT': 'Blokk + slag — uppercut, blokk + spark — feiing, blokk + tungt tett innpå — kast.', 'mv.flip': 'Salto', 'mv.flipT': 'Alene — unnamanøver bakover. Mot motstanderen — hælspark ovenfra.',
      'mv.air': 'I lufta', 'mv.airT': 'I hoppet: slag eller spark. En motstander som er sendt opp med uppercut, kan sjongleres i lufta.',
      'pad.p': 'Slag', 'pad.k': 'Spark', 'pad.h': 'Tungt', 'pad.block': 'Blokk', 'pad.f': 'Salto', 'pad.s': 'Spesial', 'pad.u': 'Super', 'pad.jump': 'Hopp',
      'login.btn': 'Logg inn med e-post', 'login.as': 'Logget inn som {e}', 'login.out': 'Logg ut', 'login.title': 'Logg inn med e-post', 'login.text': 'Vi sender en kode og en innloggingslenke. Historiefremgangen lagres på kontoen og åpnes på alle enheter.',
      'login.email': 'E-postadressen din', 'login.send': 'Send kode', 'login.code': 'Kode fra e-posten', 'login.verify': 'Logg inn', 'login.sent': 'E-post sendt til {e}. Skriv inn koden eller trykk på lenken i e-posten.',
      'login.bad': 'Feil eller utløpt kode', 'login.err': 'Mislyktes: {e}', 'login.ok': 'Du er logget inn. Fremgangen er synkronisert.', 'login.badEmail': 'Sjekk e-postadressen', 'login.wait': 'Vent et minutt før du ber om ny e-post', 'login.synced': 'Fremgangen er lagret på kontoen'
    }
  };
  // Бійці, арени та історія різними мовами
  const FIGHTER_TEXT = {
    uk: {
      taras: ['Тарас', 'Булат, козак-характерник', 'Ривок', 'Стрімкий наскок з ударом', 'Вовчий шквал', 'Серія з п’яти ударів, від якої не втекти'],
      olena: ['Олена', 'Буря, вулична чаклунка', 'Вогняна куля', 'Кидає полум’я на відстань', 'Блискавка Перуна', 'Удар блискавки з неба'],
      baron: ['Барон', 'Залізний легіонер', 'Таран', 'Плечем уперед, збиває з ніг', 'Землетрус', 'Удар об землю, хвиля валить суперника'],
      voron: ['Ворон', 'Тіньовий убивця', 'Кинджал', 'Кидає ніж у суперника', 'Тіньовий клинок', 'Зникає в диму й б’є зі спини'],
      otaman: ['Отаман', 'Сивий отаман із шаблею', 'Козацький наскок', 'Влітає плечем, збиває з ніг', 'Шабельний вихор', 'П’ять ударів шаблею поспіль'],
      mavka: ['Мавка', 'Лісова відьма', 'Блудний вогник', 'Зелений вогонь летить до суперника', 'Гнів лісу', 'Зелені блискавки з неба'],
      lytsar: ['Чорний лицар', 'Володар цитаделі, фінальний бос', 'Темний спис', 'Метає спис через усю арену', 'Темний розлам', 'Земля розколюється хвилею']
    },
    en: {
      taras: ['Taras', 'Bulat, Cossack mystic', 'Dash', 'A swift lunge with a strike', 'Wolf Squall', 'Five unstoppable blows in a row'],
      olena: ['Olena', 'Storm, street sorceress', 'Fireball', 'Hurls fire from a distance', 'Perun’s Lightning', 'Lightning strikes from the sky'],
      baron: ['Baron', 'Iron legionnaire', 'Ram', 'Shoulder charge that knocks down', 'Earthquake', 'Slams the ground, the wave knocks the foe down'],
      voron: ['Voron', 'Shadow assassin', 'Dagger', 'Throws a knife at the opponent', 'Shadow Blade', 'Vanishes in smoke and strikes from behind'],
      otaman: ['Otaman', 'Grey ataman with a sabre', 'Cossack Charge', 'Crashes in with a shoulder, knocks down', 'Sabre Whirlwind', 'Five sabre strikes in a row'],
      mavka: ['Mavka', 'Forest witch', 'Will-o’-the-wisp', 'Green fire flies at the opponent', 'Wrath of the Forest', 'Green lightning from the sky'],
      lytsar: ['Black Knight', 'Lord of the citadel, final boss', 'Dark Spear', 'Throws a spear across the arena', 'Dark Rift', 'The ground splits in a wave']
    },
    no: {
      taras: ['Taras', 'Bulat, kosakk-mystiker', 'Utfall', 'Et lynraskt utfall med slag', 'Ulvekast', 'Fem slag på rad som ikke kan unngås'],
      olena: ['Olena', 'Storm, gateheks', 'Ildkule', 'Kaster ild på avstand', 'Peruns lyn', 'Lyn slår ned fra himmelen'],
      baron: ['Baron', 'Jernlegionær', 'Rambukk', 'Skulderstøt som slår ned', 'Jordskjelv', 'Slår i bakken, bølgen velter motstanderen'],
      voron: ['Voron', 'Skyggeleiemorder', 'Dolk', 'Kaster en kniv mot motstanderen', 'Skyggeblad', 'Forsvinner i røyk og slår bakfra'],
      otaman: ['Otaman', 'Gråhåret ataman med sabel', 'Kosakkangrep', 'Braser inn med skulderen og slår ned', 'Sabelvirvel', 'Fem sabelhugg på rad'],
      mavka: ['Mavka', 'Skogheks', 'Lyktemann', 'Grønn ild flyr mot motstanderen', 'Skogens vrede', 'Grønne lyn fra himmelen'],
      lytsar: ['Den svarte ridderen', 'Herre over citadellet, siste sjef', 'Mørkt spyd', 'Kaster et spyd over hele arenaen', 'Mørk revne', 'Bakken sprekker i en bølge']
    }
  };
  const ARENA_TEXT = {
    uk: { zala: 'Бойова світлиця', tron: 'Тронна зала', shynok: 'Шинок', pidval: 'Катакомби', kurhan: 'Курган на заході сонця', porohy: 'Скелі під грозою', kuznia: 'Нічна цитадель' },
    en: { zala: 'Training Hall', tron: 'Throne Room', shynok: 'Tavern', pidval: 'Catacombs', kurhan: 'Burial Mound at Sunset', porohy: 'Cliffs in the Storm', kuznia: 'Night Citadel' },
    no: { zala: 'Treningssalen', tron: 'Tronsalen', shynok: 'Vertshuset', pidval: 'Katakombene', kurhan: 'Gravhaugen i solnedgang', porohy: 'Klippene i uværet', kuznia: 'Nattcitadellet' }
  };
  const CAMP_TEXT = {
    uk: [
      ['Перший поєдинок', 'Про Турнір семи арен ходять легенди: хто переможе всіх чемпіонів, той кине виклик Чорному лицарю. У світлиці на тебе вже чекає Олена — вона перевірить, чи ти взагалі вмієш битися.'],
      ['Курган на заході', 'Біля старого кургану Мавка стереже степ. Вона швидка й кидається зеленим вогнем. Тримай дистанцію коротко й не давай їй чаклувати.'],
      ['Бійка в шинку', 'Тарас «Булат» не любить, коли хтось бере його чарку. У тісному шинку місця мало — блокуй і відповідай серіями.'],
      ['Катакомби', 'Під містом, серед смолоскипів і ланцюгів, ховається Ворон. Він зникає в диму й б’є зі спини. Слухай кроки.'],
      ['Гроза над порогами', 'Залізний легіонер Барон важкий, але кожен його удар збиває з ніг. Ухиляйся сальто і бий, коли він промахнувся.'],
      ['Тронна зала', 'Сивий Отаман охороняє вхід до цитаделі. Колись він сам виграв турнір. Покажи йому, що виросла нова зміна.'],
      ['Цитадель Чорного лицаря', 'Брама кузні розпечена до червоного. Чорний лицар чекає. У нього більше сил, ніж у будь-кого, — переможи його, і турнір твій.']
    ],
    en: [
      ['First Duel', 'Legends tell of the Tournament of Seven Arenas: whoever defeats every champion may challenge the Black Knight. Olena is waiting for you in the hall — she will test whether you can fight at all.'],
      ['Mound at Sunset', 'Mavka guards the steppe by the old burial mound. She is fast and throws green fire. Stay close and don’t let her cast spells.'],
      ['Tavern Brawl', 'Taras “Bulat” hates it when someone takes his drink. The tavern is cramped — block and answer with combos.'],
      ['Catacombs', 'Beneath the city, among torches and chains, Voron is hiding. He vanishes in smoke and strikes from behind. Listen for footsteps.'],
      ['Storm over the Rapids', 'Baron, the iron legionnaire, is slow, but every blow knocks you down. Flip away and strike when he misses.'],
      ['Throne Room', 'The grey Otaman guards the citadel gate. He once won the tournament himself. Show him a new generation has risen.'],
      ['Citadel of the Black Knight', 'The forge gate glows red-hot. The Black Knight is waiting. He is stronger than anyone — defeat him and the tournament is yours.']
    ],
    no: [
      ['Den første duellen', 'Det går sagn om Turneringen med sju arenaer: den som slår alle mesterne, kan utfordre Den svarte ridderen. Olena venter i salen — hun vil teste om du i det hele tatt kan slåss.'],
      ['Gravhaugen i solnedgang', 'Mavka vokter steppen ved den gamle gravhaugen. Hun er rask og kaster grønn ild. Hold deg tett innpå og ikke la henne trylle.'],
      ['Slagsmål på vertshuset', 'Taras «Bulat» liker ikke at noen tar glasset hans. Det er trangt på vertshuset — blokker og svar med kombinasjoner.'],
      ['Katakombene', 'Under byen, blant fakler og lenker, gjemmer Voron seg. Han forsvinner i røyk og slår bakfra. Lytt etter skritt.'],
      ['Uvær over strykene', 'Jernlegionæren Baron er tung, men hvert slag slår deg ned. Hopp unna med salto og slå når han bommer.'],
      ['Tronsalen', 'Den gråhårede Otaman vokter porten til citadellet. Han vant selv turneringen en gang. Vis ham at en ny generasjon har vokst opp.'],
      ['Den svarte ridderens citadell', 'Smieporten gløder rødt. Den svarte ridderen venter. Han er sterkere enn noen — slå ham, og turneringen er din.']
    ]
  };
  const NAV_LANG = (navigator.language || 'uk').slice(0, 2).toLowerCase();
  let lang = storage.get('duel3d.lang', NAV_LANG === 'nb' || NAV_LANG === 'nn' || NAV_LANG === 'no' ? 'no' : NAV_LANG === 'en' ? 'en' : 'uk');
  { const ql = (location.search.match(/[?&]lang=(uk|en|no)/) || [])[1]; if (ql) lang = ql; }
  if (!I18N[lang]) lang = 'uk';
  function t(key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) || I18N.uk[key] || key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  // L — те саме, що t, для місць, де змінна t означає час
  const L = (key, vars) => t(key, vars);
  const FT = (id, i) => ((FIGHTER_TEXT[lang] || FIGHTER_TEXT.uk)[id] || FIGHTER_TEXT.uk[id] || [id, '', '', '', '', ''])[i];
  const fName = id => FT(id, 0), fTitle = id => FT(id, 1);
  const spName = id => FT(id, 2), spDesc = id => FT(id, 3), suName = id => FT(id, 4), suDesc = id => FT(id, 5);
  const arenaName = id => (ARENA_TEXT[lang] || ARENA_TEXT.uk)[id] || id;
  const campText = (i, j) => ((CAMP_TEXT[lang] || CAMP_TEXT.uk)[i] || CAMP_TEXT.uk[i])[j];
  // Застосовує мову до всіх елементів із data-i18n / data-i18n-ph / data-i18n-aria
  const langHooks = [];
  function applyLang() {
    document.documentElement.lang = lang === 'no' ? 'nb' : lang;
    document.title = t('doc.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('.langs [data-lang]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.lang === lang)));
    for (const h of langHooks) { try { h(); } catch (e) { /* ігноруємо */ } }
  }
  function setLang(l) { if (!I18N[l]) return; lang = l; storage.set('duel3d.lang', l); applyLang(); }
