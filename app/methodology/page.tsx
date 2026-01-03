'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

export default function MethodologyPage() {
  const router = useRouter();
  const { language } = useAppLanguage();

  const content = {
    en: {
      backToClusters: '← Назад к темам',
      title: 'The FaloClaro Method',
      section1: {
        p1: 'We are all different, and we all absorb information in different ways.',
        p2: 'Some people prefer rules and grammar tables, others need explanations and structure.',
        p3: 'I personally found a different path — learning a language through repetition and memorising real-life phrases.',
        p4: 'I noticed that when I repeat the same phrase many times, several things start to happen naturally:',
        list: [
          'I begin to understand its meaning more clearly,',
          'my pronunciation becomes more confident,',
          'the phrase stops feeling foreign and starts living in my head,',
          'and later, it becomes easy to expand it with other words and expressions.',
        ],
        p5: 'I truly believe that any language is a skill, and like any skill, it can be learned through repetition.',
      },
      section2: {
        title: 'Why phrases instead of grammar',
        p1: 'In real life, people use a limited set of words and expressions.',
        p2: 'Even native speakers rely on a relatively small vocabulary in their everyday communication.',
        p3: 'For perspective:',
        list: [
          'the Portuguese language contains hundreds of thousands of words,',
          'everyday communication requires only a few thousand,',
          'and to start understanding others and expressing basic ideas, even fewer are enough.',
        ],
        p4: 'FaloClaro focuses on the most common, widely used phrases you actually hear in daily life.',
        p5: 'In total, the app contains around 600 phrases, which equals roughly 2,500–3,000 unique words.',
        p6: 'This is enough to:',
        list2: [
          'start recognising spoken language,',
          'feel more comfortable in simple conversations,',
          'and gradually enter the language without overload.',
        ],
      },
      section3: {
        title: 'How to use the app',
        p1: 'The idea is very simple:',
        list: [
          'choose a phrase cluster,',
          'play a phrase,',
          'set it on repeat,',
          'and repeat it out loud as many times as you need.',
        ],
        p2: 'You can:',
        list2: [
          'slow down the pronunciation,',
          'control the number of repetitions,',
          'move on only when the phrase truly sticks.',
        ],
        p3: 'Adjust the settings so the phrase really sinks in.',
        p4: 'Over time, as you accumulate more and more phrases, you will naturally begin to connect them into longer sentences — without consciously learning grammar rules.',
      },
      section4: {
        title: 'A personal note',
        p1: 'I built this app first of all for myself.',
        p2: 'After two years of living in Portugal, I realised I finally wanted to seriously commit to learning the language, but not through traditional courses.',
        p3: 'So I am learning Portuguese together with you.',
        p4: 'From time to time, I will:',
        list: [
          'add new phrases,',
          'improve the app,',
          'and continue developing it as my own learning progresses.',
        ],
      },
      section5: {
        title: 'Feedback',
        p1: 'If you have thoughts, ideas, or impressions while using FaloClaro,',
        p2: 'I would genuinely love to hear your feedback.',
        p3: 'This is a living project, growing together with the people who use it.',
        p4: 'Obrigado and good luck on your Portuguese journey 🇵🇹',
      },
    },
    ru: {
      backToClusters: '← Назад к темам',
      title: 'Метод FaloClaro',
      section1: {
        p1: 'Мы все разные и по-разному воспринимаем информацию.',
        p2: 'Кто-то любит правила и таблицы, кто-то — объяснения и логику.',
        p3: 'Я же для себя нашёл другой путь — изучение языка через повторение и заучивание живых фраз.',
        p4: 'Я заметил, что когда я многократно повторяю одну и ту же фразу, со временем происходит несколько вещей одновременно:',
        list: [
          'я начинаю лучше понимать её смысл,',
          'произношение становится увереннее,',
          'фраза перестаёт быть «чужой» и начинает жить в голове,',
          'а позже — легко дополняется другими словами и выражениями.',
        ],
        p5: 'Я искренне верю, что любой язык — это навык, а любой навык можно освоить через повторение.',
      },
      section2: {
        title: 'Почему фразы, а не грамматика',
        p1: 'В реальной жизни человек использует ограниченное количество слов и выражений.',
        p2: 'Даже носители языка ежедневно оперируют относительно небольшим набором фраз.',
        p3: 'Для ориентира:',
        list: [
          'в португальском языке насчитывается сотни тысяч слов,',
          'но для повседневного общения достаточно нескольких тысяч,',
          'а чтобы начать понимать людей и объяснять свои базовые мысли — ещё меньше.',
        ],
        p4: 'В FaloClaro собраны самые ходовые, распространённые фразы, которые реально используются в жизни.',
        p5: 'В сумме здесь около 600 фраз, что даёт примерно 2 500–3 000 уникальных слов.',
        p6: 'Этого достаточно, чтобы:',
        list2: [
          'начать узнавать речь на слух,',
          'перестать теряться в простых диалогах,',
          'и постепенно войти в язык без перегруза.',
        ],
      },
      section3: {
        title: 'Как пользоваться приложением',
        p1: 'Идея очень простая:',
        list: [
          'выберите тематику с фразами,',
          'включите фразу,',
          'поставьте её на повтор,',
          'повторяйте вслух столько раз, сколько нужно именно вам.',
        ],
        p2: 'Вы можете:',
        list2: [
          'замедлять произношение,',
          'настраивать количество повторов,',
          'переключаться на следующую фразу только тогда, когда предыдущая «уложилась».',
        ],
        p3: 'Сделайте настройки так, чтобы фраза буквально врезалась в память.',
        p4: 'Со временем, когда таких фраз станет много, вы начнёте естественно связывать их между собой в более длинные предложения — без заучивания правил.',
      },
      section4: {
        title: 'Немного личного',
        p1: 'Я сделал это приложение в первую очередь для себя.',
        p2: 'После двух лет жизни в Португалии я понял, что хочу наконец осознанно заняться языком, но не через классические курсы.',
        p3: 'Поэтому я учу португальский вместе с вами.',
        p4: 'Я буду регулярно:',
        list: [
          'дополнять фразы,',
          'улучшать приложение,',
          'и развивать его по мере собственного обучения.',
        ],
      },
      section5: {
        title: 'Обратная связь',
        p1: 'Если у вас появятся мысли, идеи или ощущения от использования FaloClaro —',
        p2: 'мне будет очень приятно получить ваш отзыв.',
        p3: 'Это живой проект, и он развивается вместе с теми, кто им пользуется.',
        p4: 'Obrigado e boa sorte no caminho com o português 🇵🇹',
      },
    },
    pt: {
      backToClusters: '← Назад к темам',
      title: 'O Método FaloClaro',
      section1: {
        p1: 'Somos todos diferentes e absorvemos informações de formas diferentes.',
        p2: 'Algumas pessoas preferem regras e tabelas de gramática, outras precisam de explicações e estrutura.',
        p3: 'Eu pessoalmente encontrei um caminho diferente — aprender um idioma através da repetição e memorização de frases da vida real.',
        p4: 'Notei que quando repito a mesma frase muitas vezes, várias coisas começam a acontecer naturalmente:',
        list: [
          'começo a entender melhor o seu significado,',
          'minha pronúncia fica mais confiante,',
          'a frase deixa de parecer estrangeira e começa a viver na minha cabeça,',
          'e depois, torna-se fácil expandi-la com outras palavras e expressões.',
        ],
        p5: 'Acredito verdadeiramente que qualquer idioma é uma habilidade, e como qualquer habilidade, pode ser aprendido através da repetição.',
      },
      section2: {
        title: 'Por que frases em vez de gramática',
        p1: 'Na vida real, as pessoas usam um conjunto limitado de palavras e expressões.',
        p2: 'Até mesmo falantes nativos dependem de um vocabulário relativamente pequeno em sua comunicação cotidiana.',
        p3: 'Para perspectiva:',
        list: [
          'a língua portuguesa contém centenas de milhares de palavras,',
          'a comunicação cotidiana requer apenas alguns milhares,',
          'e para começar a entender os outros e expressar ideias básicas, ainda menos são suficientes.',
        ],
        p4: 'O FaloClaro foca nas frases mais comuns e amplamente usadas que você realmente ouve no dia a dia.',
        p5: 'No total, o aplicativo contém cerca de 600 frases, o que equivale a aproximadamente 2.500–3.000 palavras únicas.',
        p6: 'Isso é suficiente para:',
        list2: [
          'começar a reconhecer a língua falada,',
          'sentir-se mais confortável em conversas simples,',
          'e gradualmente entrar no idioma sem sobrecarga.',
        ],
      },
      section3: {
        title: 'Como usar o aplicativo',
        p1: 'A ideia é muito simples:',
        list: [
          'escolha um cluster de frases,',
          'reproduza uma frase,',
          'defina-a para repetir,',
          'e repita em voz alta quantas vezes precisar.',
        ],
        p2: 'Você pode:',
        list2: [
          'diminuir a velocidade da pronúncia,',
          'controlar o número de repetições,',
          'passar para a próxima apenas quando a frase realmente ficar na memória.',
        ],
        p3: 'Ajuste as configurações para que a frase realmente entre na memória.',
        p4: 'Com o tempo, à medida que você acumula cada vez mais frases, começará naturalmente a conectá-las em frases mais longas — sem aprender conscientemente regras de gramática.',
      },
      section4: {
        title: 'Uma nota pessoal',
        p1: 'Construí este aplicativo principalmente para mim.',
        p2: 'Depois de dois anos vivendo em Portugal, percebi que finalmente queria me comprometer seriamente a aprender o idioma, mas não através de cursos tradicionais.',
        p3: 'Então estou aprendendo português junto com você.',
        p4: 'De tempos em tempos, vou:',
        list: [
          'adicionar novas frases,',
          'melhorar o aplicativo,',
          'e continuar desenvolvendo-o conforme meu próprio aprendizado progride.',
        ],
      },
      section5: {
        title: 'Feedback',
        p1: 'Se você tiver pensamentos, ideias ou impressões ao usar o FaloClaro,',
        p2: 'eu genuinamente adoraria ouvir seu feedback.',
        p3: 'Este é um projeto vivo, crescendo junto com as pessoas que o usam.',
        p4: 'Obrigado e boa sorte na sua jornada com o português 🇵🇹',
      },
    },
  };

  const t = content[language] || content.en;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 pb-[10px]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/clusters" className="flex items-center cursor-pointer">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
              style={{ width: 'auto', height: '40px' }}
            />
          </Link>
          
          {/* Language Selector */}
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </div>

        {/* Back Button */}
        <div className="max-w-md mx-auto px-4">
          <button
            onClick={() => router.push('/clusters')}
            className="block w-full px-4 py-2 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.backToClusters}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <h1 className="text-4xl font-bold mb-8 mt-4">{t.title}</h1>

        {/* Section 1 */}
        <section className="mb-8">
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section1.p1}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section1.p2}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section1.p3}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section1.p4}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section1.list.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section1.p5}</p>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t.section2.title}</h2>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p1}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p2}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p3}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section2.list.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p4}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p5}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section2.p6}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section2.list2.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t.section3.title}</h2>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section3.p1}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section3.list.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section3.p2}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section3.list2.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section3.p3}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section3.p4}</p>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t.section4.title}</h2>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section4.p1}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section4.p2}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section4.p3}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section4.p4}</p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            {t.section4.list.map((item, index) => (
              <li key={index} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t.section5.title}</h2>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section5.p1}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section5.p2}</p>
          <p className="mb-4 text-gray-900 leading-relaxed">{t.section5.p3}</p>
          <p className="mb-4 text-gray-900 leading-relaxed font-medium">{t.section5.p4}</p>
        </section>
      </div>
    </div>
  );
}
