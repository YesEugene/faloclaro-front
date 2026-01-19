'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function SubscriptionLandingPage() {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [courseCardHover, setCourseCardHover] = useState(false);
  const [trainerCardHover, setTrainerCardHover] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide success popup after 5 seconds
  useEffect(() => {
    if (submitted && showSuccessPopup) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
        setSubmitted(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitted, showSuccessPopup]);

  const scrollToStartFree = () => {
    const element = document.getElementById('start-free');
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - (window.innerHeight / 2) + (element.offsetHeight / 2);
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const translations = {
    en: {
      heroTitle: 'Learn Portuguese you can use',
      heroSubtitle: 'Start speaking in your daily flow.',
      heroDescription: 'FaloClaro is inspired by the Michel Thomas method and modern neuroscience. We train your speaking reflex before your grammar brain wakes up.',
      heroCta: 'Get 3 lessons free.',
      heroCtaSub: 'Instant access by email.',
      emailPlaceholder: 'Your E-mail',
      buttonStart: 'Get it!',
      buttonLearnMore: 'Or learn more',
      disclaimer: 'No spam. You\'ll get a personal link to start immediately.',
      noCard: 'No credit card required. You can cancel anytime.',
      
      whatIsTitle: 'What is FaloClaro',
      whatIsSubtitle: 'Two parts. One idea.',
      courseTitle: 'The Course',
      courseItems: [
        '60 short lessons.',
        '5 tasks per lesson.',
        '15–20 minutes a day.',
      ],
      courseDescription: 'This is the structured path: you move from simple phrases to real situations, step by step.',
      courseButton: 'Start',
      trainerTitle: 'The Trainer',
      trainerIntro: 'A phrase-repetition space:',
      trainerItems: [
        'Choose a topic',
        'Choose words or sentences',
        'Listen and repeat.',
      ],
      trainerDescription: 'This is where the language becomes automatic.',
      trainerButton: 'Start',
      
      whyWorksTitle: 'Why it works',
      whyWorksSubtitle: 'We don\'t start with rules. We start with real phrases and let your brain build the language.',
      whyWorksOld: 'Most language apps start with explanations and memorizing rules.',
      whyWorksNew: 'FaloClaro trains your brain to recognize it, hear it and produce it.',
      whyWorksNew2: 'You don\'t start with grammar.\nYou start with living phrases.',
      whyWorksActions: ['You repeat them', 'You say them', 'You hear them'],
      whyWorksResult: 'Until they stop feeling foreign.\nThat\'s how real language is built.',
      
      howToTitle: 'How to use the course',
      howToSubtitle: 'One simple rule. Do 1-2 lessons per day. Not more.',
      step1Title: 'Learn a few phrases in the morning.',
      step2Title: 'Use the trainer during the day.',
      step3Title: 'Let the phrases settle.',
      howToResult1: 'That\'s it.',
      howToResult2: 'No pressure. No homework. Just real contact with the language.',
      
      learnTitle: 'What you will learn',
      learnSubtitle: 'In the course you train things you actually need:',
      learnTopics: [
        'asking and answering',
        'politeness and requests',
        'prices and shopping',
        'cafes and restaurants',
        'time and directions',
        'home and daily life',
        'emotions and reactions',
        'short and long sentences',
      ],
      learnPhrases: 'About 600 real phrases',
      learnWords: '2,500-3,000 words',
      
      startFreeTitle: 'Start for free',
      startFreeSubtitle: 'You don\'t need to decide now.',
      startFreeDesc: 'Enter your email and get:',
      startFreeItem1: '3 full lessons',
      startFreeItem2: 'No credit card required',
      startFreeButton: 'Try 3 lessons for free.',
      startFreeNote: 'No spam. No worries. You can cancel anytime.',
      startFreeEndText: 'If you like our approach,\nyou can unlock all 60 lessons for €20.',

      faqTitle: 'Everything you need to know about the course',
      faqItems: [
        {
          q: 'How does the FaloClaro methodology work and who is this course for?',
          a:
            'The FaloClaro methodology is built around two main goals.\n\nOn one side, the course follows the logic of international language levels (A1 → A2 → B1) used in official Portuguese exams. Step by step, we develop the same core skills: understanding spoken language, navigating information, working with time, causes, and messages.\n\nOn the other side, our main goal is to help you start speaking. That is why learning is not built around grammar rules, but around practice: real phrases, connected speech, and everyday situations.\n\nThe entire course is divided into 4 phases (modules) and is designed to take about 60 days:\n• Phase 1 (A1) — speech recognition and basic reactions\n• Phase 2 (A2) — information search and situational orientation\n• Phase 3 (A2+) — working with stories, time, and causes\n• Phase 4 (B1) — confident messaging, decision-making, and discussing events\n\nThis approach works well both for complete beginners and for learners who already studied Portuguese but want to move from “I recognize some words” to real-life language use.',
        },
        {
          q: 'How does learning in FaloClaro work?',
          a:
            'Learning in FaloClaro is built around short, clear lessons and constant practice. Each lesson consists of 5 tasks: from learning new words to actively using them in speech. You gradually move from listening to speaking, without overload or sudden jumps in difficulty.\n\nOn average, one lesson takes 15 to 25 minutes, depending on your pace and number of repetitions. We recommend studying regularly, but without rushing. It is better to fully absorb one lesson than to quickly complete several.\n\nEach module contains 14–15 lessons. The full course is designed for about 60 days of consistent learning. This is enough time to build stable language skills and move from isolated phrases to connected speech.\n\nIt is best to complete lesson tasks in order, since they are logically structured: first vocabulary, then structure, comprehension, and practice. This helps your brain absorb the material faster.\n\nAt the same time, you can always return to any completed lesson or task. Repetition is part of the methodology and is considered a natural part of learning, not a mistake or a step backward.',
        },
        {
          q: 'How does free access and payment work in FaloClaro?',
          a:
            'After registration, you get free access to the first 3 lessons of the course. This is enough to explore the format, understand the methodology, and decide if this learning style works for you.\n\nAfter the free lessons, you can unlock full access to the entire course with a one-time payment of 20 euros. This is a single purchase, not a subscription.\n\nAfter payment, you receive permanent access to all modules, lessons, and course updates. There are no monthly charges or recurring payments.\n\nFaloClaro has no hidden fees. The price you see is the final cost of the full course. We do not sell separate lessons or extra “packages”.\n\nYou try the course for free first, and only then decide whether to unlock full access.',
        },
        {
          q: 'What do I need to study with FaloClaro?',
          a:
            'FaloClaro works directly in your browser. You can study on your phone, tablet, or computer. No installation is required, just open the link you receive by email.\n\nYou learn at your own pace. You can complete one lesson per day or several in one session. You choose the rhythm that fits your schedule and lifestyle.\n\nIf you miss a few days, nothing bad happens. The course is not tied to a strict schedule. You can always return to any lesson and continue from where you stopped.\n\nYour progress is saved automatically, so you never lose your results and can return to practice at any time.',
        },
        {
          q: 'What results can I expect from FaloClaro?',
          a:
            'This is not a magic shortcut. You still need to spend about 15–20 minutes per day and stay focused. However, we designed the course to be easy to follow and comfortable to use.\n\nConfidence in understanding spoken Portuguese builds gradually. The course is structured so that you slowly adapt to the sound of the language, speaking speed, and sentence structure. There is a strong chance you will notice your first clear improvements in listening comprehension by the end of the first module, and the skill will continue to grow afterward.\n\nFaloClaro is well suited for relocation and everyday life in Portugal. The course focuses on real situations: shopping, transport, cafés, services, and daily communication. You are not learning abstract language, but what people actually use every day.',
        },
      ],
      
      aboutTitle: 'I built FaloClaro for myself.',
      aboutSubtitle: 'After two years of living in Portugal, we realized we wanted to stay, which meant we finally had to learn the language. As always, time was limited because of work, so we needed an online format. But not a "school". We wanted practice, something that helps you speak and actually feel the language.',
      aboutText: 'I\'m an entrepreneur, and one of my main projects in the past was a large educational platform. When I couldn\'t find a language-learning format that really worked for me, I did what I know best in EdTech, I built it myself, together with strong linguists and Portuguese teachers.\n\nWe designed FaloClaro to be simple, calm, and based on repetition and practice. Not like a grammar textbook, but as a way for the language to slowly start living in your head.\n\nI\'m learning Portuguese together with you, and my personal challenge is to start speaking in 60 days.\n\nObrigado, and welcome 🇵🇹',
      
      contactTitle: 'Write a message to FaloClaro',
      contactButton: 'Send',
      
      successMessage: 'We\'ve sent you the first lesson by email.',
      successSubtext: 'Check your email and click the link in the message.',
    },
    ru: {
      heroTitle: 'Изучай португальский для жизни',
      heroSubtitle: 'Начни говорить, не отвлекаясь от своих задач.',
      heroDescription: 'FaloClaro вдохновлен методом Мишеля Томаса и нейронаукой. Здесь вы начинаете говорить раньше, чем думать о грамматике.',
      heroCta: 'Получи 3 урока бесплатно.',
      heroCtaSub: 'Мгновенный доступ по email.',
      emailPlaceholder: 'Твой Email',
      buttonStart: 'Получить!',
      buttonLearnMore: 'Или узнать больше',
      disclaimer: 'Без спама. Ты получишь персональную ссылку\nи начнешь учиться.',
      noCard: 'Без карты. Можно отменить в любой момент.',
      
      whatIsTitle: 'Что такое FaloClaro',
      whatIsSubtitle: 'Две части. Одна идея.',
      courseTitle: 'Курс',
      courseItems: [
        '60 коротких уроков.',
        '5 заданий в уроке.',
        '15–20 минут в день.',
      ],
      courseDescription: 'Это структурированный путь: ты переходишь от простых фраз к реальным ситуациям, шаг за шагом.',
      courseButton: 'Начать',
      trainerTitle: 'Тренажер',
      trainerIntro: 'Пространство для повторения фраз:',
      trainerItems: [
        'Выбери тему',
        'Выбери слова или предложения',
        'Слушай и повторяй.',
      ],
      trainerDescription: 'Здесь язык становится автоматическим.',
      trainerButton: 'Начать',
      
      whyWorksTitle: 'Почему это работает',
      whyWorksSubtitle: 'Вместо правил — живые фразы. Вместо зубрёжки — естественное привыкание к языку.',
      whyWorksOld: 'Большинство языковых школ и приложений начинает обучение с объяснения и запоминания правил.',
      whyWorksNew: 'FaloClaro помогает тебе слышать язык, узнавать слова и самому говорить на португальском.',
      whyWorksNew2: 'Ты не будешь начинать грызть грамматику.\nТы начнешь с настоящих, живых фраз.',
      whyWorksActions: ['Ты их повторяешь', 'Ты их говоришь', 'Ты их слышишь'],
      whyWorksResult: 'Пока слова не перестанут быть тебе чужими.\nИменно так устроен настоящий язык.',
      
      howToTitle: 'Как использовать курс',
      howToSubtitle: 'Одно простое правило. Делай 1-2 урока в день. Не больше.',
      step1Title: 'Учи несколько фраз утром.',
      step2Title: 'Используй тренажер в течение дня.',
      step3Title: 'Дай фразам уложиться.',
      howToResult1: 'Вот и все.',
      howToResult2: 'Никакого давления, Нет домашки. Только настоящее взаимодействие с языком.',
      
      learnTitle: 'Что ты выучишь',
      learnSubtitle: 'В курсе ты тренируешь то, что действительно нужно:',
      learnTopics: [
        'задавать вопросы и отвечать',
        'вежливость и просьбы',
        'цены и покупки',
        'кафе и рестораны',
        'время и направления',
        'дом и повседневная жизнь',
        'эмоции и реакции',
        'короткие и длинные предложения',
      ],
      learnPhrases: 'Около 600 реальных фраз',
      learnWords: '2,500-3,000 слов',
      
      startFreeTitle: 'Начни бесплатно',
      startFreeSubtitle: 'Максимум что произойдет, ты узнаешь что-то новое.',
      startFreeDesc: 'Введи email и получи:',
      startFreeItem1: '3 полных урока',
      startFreeItem2: 'Без карты',
      startFreeButton: 'Попробуй 3 урока бесплатно.',
      startFreeNote: 'Без спама. Без переживаний. Можно отменить в любой момент.',
      startFreeEndText: 'Если тебе понравится наш подход,\nты сможешь купить весь курс из 60 уроков за 20€.',

      faqTitle: 'Все, что нужно знать о курсе',
      faqItems: [
        {
          q: 'Как устроена методология FaloClaro и для кого подходит этот курс?',
          a:
            'Методология FaloClaro построена на пересечении двух целей.\nС одной стороны, курс опирается на логику международных языковых уровней (A1 → A2 → B1), которые используются в официальных экзаменах по португальскому. Мы постепенно развиваем те же навыки: понимание речи, ориентацию в информации, работу с временем, причинами и сообщениями.\n\nС другой стороны, наша главная цель — чтобы ты начал говорить. Поэтому обучение построено не вокруг правил, а вокруг практики: живых фраз, связной речи и реальных ситуаций.\n\nВесь курс разбит на 4 фазы (модуля) и рассчитан примерно на 60 дней:\n• Phase 1 (A1) — распознавание речи и базовые реакции\n• Phase 2 (A2) — поиск информации и ориентация в среде\n• Phase 3 (A2+) — работа с историями, временем и причинами\n• Phase 4 (B1) — уверенные сообщения, решения и обсуждение событий\n\nТакой подход подходит для начинающих с нуля и для тех, кто уже учил язык, но хочет перейти от «понимаю отдельные слова» к реальному использованию языка в жизни.',
        },
        {
          q: 'Как проходит обучение в FaloClaro?',
          a:
            'Обучение в FaloClaro построено вокруг коротких, понятных уроков и постоянной практики. Один урок состоит из 5 заданий: от знакомства с новыми словами до активного использования их в речи. Ты постепенно переходишь от восприятия к говорению, без перегрузки и резких скачков сложности.\n\nВ среднем один урок занимает от 15 до 25 минут, в зависимости от темпа и количества повторений. Мы рекомендуем заниматься регулярно, но без спешки. Лучше хорошо проработать один урок, чем быстро пройти несколько.\n\nВ каждом модуле 14–15 уроков. Весь курс рассчитан примерно на 60 дней последовательного обучения. Этого достаточно, чтобы сформировать устойчивые языковые навыки и перейти от отдельных фраз к связной речи.\n\nЗадания внутри урока лучше проходить по порядку, так как они выстроены логически: сначала словарь, затем структура, понимание и практика. Это помогает мозгу быстрее усваивать материал.\n\nПри этом ты всегда можешь возвращаться к любым пройденным урокам и заданиям. Повторение встроено в методологию и является частью процесса обучения, а не ошибкой или шагом назад.',
        },
        {
          q: 'Как работает бесплатный доступ и оплата в FaloClaro?',
          a:
            'После регистрации ты получаешь бесплатный доступ к первым 3 урокам курса. Этого достаточно, чтобы познакомиться с форматом, методологией и понять, подходит ли тебе такой способ обучения.\n\nПосле бесплатных уроков ты можешь один раз оплатить полный доступ ко всему курсу за 20 евро. Это разовая покупка, а не подписка.\n\nПосле оплаты ты получаешь постоянный доступ ко всем модулям, урокам и обновлениям курса. Никаких ежемесячных списаний и повторных платежей нет.\n\nВ FaloClaro нет скрытых платежей. Цена, которую ты видишь, это финальная стоимость полного курса. Мы не продаем отдельные уроки или дополнительные «пакеты».\n\nТы сначала пробуешь бесплатно, а затем сам решаешь, готов ли открыть полный доступ.',
        },
        {
          q: 'Что мне нужно для обучения в FaloClaro?',
          a:
            'FaloClaro работает прямо в браузере. Ты можешь учиться с телефона, планшета или компьютера. Ничего устанавливать не нужно, достаточно открыть ссылку, которую ты получаешь по Е-мейл..\n\nТы учишься в своем темпе. Можно проходить по одному уроку в день или делать несколько за раз. Ты сам выбираешь ритм, который подходит под твой график и образ жизни.\n\nЕсли ты пропустил несколько дней, ничего страшного не происходит. Курс не привязан к жесткому расписанию. Ты всегда можешь вернуться к любому уроку и продолжить с того места, где остановился.\n\nВсе твои прогрессы сохраняются автоматически, поэтому ты не теряешь результат и можешь спокойно возвращаться к практике в любое время.',
        },
        {
          q: 'Какой результат я получу от обучения в FaloClaro?',
          a:
            'Это не волшебная таблетка. Придется все же выделить 15-20 минут в день и сфокусироваться. Хотя мы постарались сделать курс легким для восприятия.\n\nУверенность в понимании речи появляется постепенно. Курс выстроен так, чтобы ты шаг за шагом привыкал к звучанию языка, темпу и структуре предложений. Есть большой шанс, что твое первые ощутимые изменения в восприятии речи появятся уже к концу первого модуля обучения, а дальше навык только усиливается.\n\nFaloClaro хорошо подходит для переезда и жизни в Португалии. Курс фокусируется на реальных ситуациях: покупки, транспорт, кафе, сервисы, повседневое общение. Ты учишь не абстрактный язык, а то, что реально используется каждый день.',
        },
      ],
      
      aboutTitle: 'Я сделал FaloClaro для себя.',
      aboutSubtitle: 'После двух лет жизни в Португалии мы поняли, что хотим остаться, а значит, язык все-таки придется выучить. Как всегда, времени мало из-за работы, поэтому нужен был онлайн-формат. Но не «школа», а практика, чтобы говорить и действительно прочувствовать язык.',
      aboutText: 'Я предприниматель, и одним из моих основных проектов в прошлом была большая образовательная платформа. Когда я не нашел формат изучения языка, который бы мне подошел, я сделал то, что умею лучше всего в EdTech — создал его сам, вместе с сильным лингвистом и преподавателями португальского.\n\nМы спроектировали FaloClaro простым, спокойным и основанным на повторении и практике. Не как учебник по грамматике. А как способ, при котором язык постепенно начинает жить у тебя в голове.\n\nЯ учу португальский вместе с вами.\nИ мой личный челлендж — начать говорить через 60 дней.\n\nObrigado и добро пожаловать 🇵🇹',
      
      contactTitle: 'Напиши сообщение FaloClaro',
      contactButton: 'Отправить',
      
      successMessage: 'Мы отправили тебе первый урок на почту.',
      successSubtext: 'Проверь почту и перейди по ссылке в письме.',
    },
  };

  const t = translations[appLanguage] || translations.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/subscription/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, language: appLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      setSubmitted(true);
      setShowSuccessPopup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    setSubmitted(false);
  };

  const [faqOpenIndex, setFaqOpenIndex] = useState<number>(-1);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-tiktok)' }}>
      {/* Hero Section - Light Green #BDF6BB */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '100%' : '868px',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Header with Logo and Language Selector - ABOVE the card */}
          <div style={{ 
            width: '100%',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: isMobile ? '16px' : '20px',
            padding: isMobile ? '0 16px' : '0'
          }}>
            {/* Logo - Left aligned */}
            <div>
              <Image
                src="/Img/Website/logo.svg"
                alt="FaloClaro"
                width={83}
                height={37}
                style={{ display: 'block' }}
              />
            </div>
            
            {/* Language Selector - Right aligned */}
            <div>
              <LanguageSelector />
            </div>
          </div>

          {/* Green Card - 868px width with rounded corners */}
          <div style={{ 
            width: isMobile ? '100%' : '868px',
            maxWidth: isMobile ? '389px' : '868px',
            height: isMobile ? 'auto' : '500px',
            minHeight: isMobile ? 'auto' : '500px',
            backgroundColor: '#BDF6BB',
            borderRadius: isMobile ? '16px' : '20px',
            padding: isMobile ? '10px' : '40px 20px 20px 20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: isMobile ? '10px' : '0'
          }}>
          {/* Hero Title */}
          <h1 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? (appLanguage === 'ru' ? '49px' : '59px') : (appLanguage === 'ru' ? '38px' : '48px'), 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginTop: isMobile ? '0px' : '31px',
            marginBottom: isMobile ? '0px' : '11px',
            paddingTop: isMobile ? '50px' : '0px',
            paddingBottom: isMobile ? '13px' : '0px',
            lineHeight: isMobile ? '1' : '1.2',
            textAlign: 'center'
          }}>
            {t.heroTitle}
          </h1>
          
          {/* Hero Subtitle - Medium weight */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '24px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginTop: isMobile ? '0px' : '-10px',
            marginBottom: isMobile ? '0px' : '45px',
            paddingLeft: '0px',
            paddingRight: '0px',
            lineHeight: isMobile ? '1.2' : '1.4',
            textAlign: 'center'
          }}>
            {t.heroSubtitle}
          </p>

          {/* Hero Description - Regular weight, 16px */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '16px' : '16px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginTop: isMobile ? '0px' : '0px',
            marginBottom: isMobile ? '0px' : '60px',
            paddingTop: isMobile ? '19px' : '0px',
            paddingBottom: isMobile ? '19px' : '0px',
            paddingLeft: '0px',
            paddingRight: '0px',
            lineHeight: isMobile ? '1.2' : '1.5',
            textAlign: 'center',
            maxWidth: isMobile ? '100%' : 'calc(100% - 60px)',
            width: isMobile ? '100%' : 'auto'
          }}>
            {t.heroDescription}
          </p>

          {/* CTA Text - Bold, 16px, reduced line height */}
          <div style={{ marginBottom: isMobile ? '16px' : '20px', textAlign: 'center' }}>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '14px' : '16px', 
              fontWeight: 700, 
              color: '#3A2E1F', 
              marginTop: isMobile ? '0px' : '0px',
              marginBottom: isMobile ? '6px' : '0',
              paddingTop: isMobile ? '34px' : '0px',
              paddingLeft: '0px',
              paddingRight: '0px',
              lineHeight: '1.2',
              textAlign: 'center'
            }}>
              {t.heroCta}
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '14px' : '16px', 
              fontWeight: 700, 
              color: '#3A2E1F', 
              marginTop: '0',
              lineHeight: '1.2',
              textAlign: 'center'
            }}>
              {t.heroCtaSub}
            </p>
          </div>

          {/* Email Form Container */}
          <form onSubmit={handleSubmit} style={{ 
            marginBottom: isMobile ? '10px' : '12px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            {/* Black Container - Email input and button */}
            <div style={{ 
              width: isMobile ? '100%' : '327px',
              maxWidth: isMobile ? '100%' : '327px',
              height: '62px',
              backgroundColor: '#000',
              borderRadius: '10px',
              padding: isMobile ? '8px' : '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              marginBottom: '0px'
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                style={{
                  flex: 1,
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#000',
                  color: '#fff',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 400,
                }}
              />
              
              {/* Yellow Button - On black container, on the right */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: isMobile ? '90px' : '94px',
                  height: isMobile ? '42px' : '46px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: '#FFF944',
                  color: '#000',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {isSubmitting ? '...' : t.buttonStart}
              </button>
            </div>
          </form>
          {error && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginBottom: '8px', textAlign: 'center' }}>{error}</div>
          )}

          {/* Disclaimer - Regular weight, 11px */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '10px' : '11px', 
            fontWeight: 400, 
            color: '#3A2E1F',
            textAlign: 'center',
            padding: isMobile ? '0 16px' : '0',
            marginBottom: isMobile ? '0px' : '0px',
            paddingBottom: isMobile ? '40px' : '30px',
            whiteSpace: 'pre-line'
          }}>
            {t.disclaimer}
          </p>
          </div>
        </div>
      </section>

      {/* What is FaloClaro - Light Pink #FFE3E3 */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* Pink Card - 868px width with rounded corners */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#FFE3E3',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '40px' : '40px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '10px' : '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            lineHeight: isMobile ? '1.0' : '1.2'
          }}>
            {t.whatIsTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '20px' : '40px',
            marginTop: '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
          }}>
            {t.whatIsSubtitle}
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: isMobile ? '10px' : '20px',
            marginBottom: isMobile ? '10px' : '0px'
          }}>
            {/* The Course - White Card */}
            <div 
              onMouseEnter={() => setCourseCardHover(true)}
              onMouseLeave={() => setCourseCardHover(false)}
              style={{
                width: isMobile ? '100%' : 'auto',
                height: isMobile ? 'auto' : 'auto',
                backgroundColor: courseCardHover ? 'rgba(255, 255, 255, 0.8)' : '#fff',
                borderRadius: '16px',
                padding: isMobile ? '24px 24px 24px 30px' : '24px 24px 24px 30px',
                display: 'flex',
                flexDirection: 'row',
                gap: isMobile ? '12px' : '16px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {/* Text Content */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}>
                <h3 style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: isMobile ? '18px' : '20px', 
                  fontWeight: 600, 
                  color: '#3A2E1F', 
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  {t.courseTitle}
                </h3>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: 0, 
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  {t.courseItems.map((item, index) => (
                    <li key={index} style={{ 
                      fontFamily: 'var(--font-tiktok)', 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: 400, 
                      color: '#3A2E1F', 
                      marginBottom: '0px',
                      textAlign: 'left'
                    }}>
                      → {item}
                    </li>
                  ))}
                </ul>

                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: isMobile ? '9px' : '10px', 
                  fontWeight: 400, 
                  color: '#3A2E1F',
                  marginBottom: '12px',
                  textAlign: 'left'
                }}>
                  {t.courseDescription}
                </p>

                <button
                  onClick={scrollToStartFree}
                  style={{
                    width: '116px',
                    height: isMobile ? '36px' : '40px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#45C240',
                    color: '#fff',
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 'auto',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px'
                  }}
                >
                  <span>{t.courseButton}</span>
                  <span style={{ fontSize: isMobile ? '12px' : '14px' }}>→</span>
                </button>
              </div>

              {/* Phone Illustration */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Image
                  src={appLanguage === 'ru' ? "/Img/Website/Interface 1 RU.svg" : "/Img/Website/PHONE_ILLUSTRATION_COURSE.svg"}
                  alt="Course"
                  width={isMobile ? 132 : 129}
                  height={isMobile ? 198 : 259}
                  style={{ 
                    width: isMobile ? '132px' : '129px',
                    height: isMobile ? '198px' : '259px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>

            {/* The Trainer - White Card */}
            <div 
              onMouseEnter={() => setTrainerCardHover(true)}
              onMouseLeave={() => setTrainerCardHover(false)}
              style={{
                width: isMobile ? '100%' : 'auto',
                height: isMobile ? 'auto' : 'auto',
                backgroundColor: trainerCardHover ? 'rgba(255, 255, 255, 0.8)' : '#fff',
                borderRadius: '16px',
                padding: isMobile ? '24px 24px 24px 30px' : '24px 24px 24px 30px',
                display: 'flex',
                flexDirection: 'row',
                gap: isMobile ? '12px' : '16px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {/* Text Content */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1
              }}>
                <h3 style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: isMobile ? '18px' : '20px', 
                  fontWeight: 600, 
                  color: '#3A2E1F', 
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  {t.trainerTitle}
                </h3>
                
                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: isMobile ? '12px' : '14px', 
                  fontWeight: 400, 
                  color: '#3A2E1F',
                  marginBottom: '12px',
                  textAlign: 'left'
                }}>
                  {t.trainerIntro}
                </p>

                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  margin: 0, 
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  {t.trainerItems.map((item, index) => (
                    <li key={index} style={{ 
                      fontFamily: 'var(--font-tiktok)', 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: 400, 
                      color: '#3A2E1F', 
                      marginBottom: '0px',
                      textAlign: 'left'
                    }}>
                      → {item}
                    </li>
                  ))}
                </ul>

                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: isMobile ? '9px' : '10px', 
                  fontWeight: 400, 
                  color: '#3A2E1F',
                  marginBottom: '12px',
                  textAlign: 'left'
                }}>
                  {t.trainerDescription}
                </p>

                <button
                  onClick={() => router.push('/clusters')}
                  style={{
                    width: '116px',
                    height: isMobile ? '36px' : '40px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 'auto',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px'
                  }}
                >
                  <span>{t.trainerButton}</span>
                  <span style={{ fontSize: isMobile ? '12px' : '14px' }}>→</span>
                </button>
              </div>

              {/* Phone Illustration */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Image
                  src={appLanguage === 'ru' ? "/Img/Website/interface 2 RU.svg" : "/Img/Website/PHONE_ILLUSTRATION_COURSE_2.png"}
                  alt="Trainer"
                  width={isMobile ? 132 : 129}
                  height={isMobile ? 198 : 259}
                  style={{ 
                    width: isMobile ? '132px' : '129px',
                    height: isMobile ? '198px' : '259px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustration 3block tags - сразу под вторым блоком */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: isMobile ? '389px' : '868px',
          padding: isMobile ? '0 10px' : '0'
        }}>
          <Image
            src={appLanguage === 'ru'
              ? (isMobile ? '/Img/Website/3block tags mob RU.svg' : '/Img/Website/3block tags RU.svg')
              : (isMobile ? '/Img/Website/3block tags mob.svg' : '/Img/Website/3block tags.svg')}
            alt="Tags illustration"
            width={isMobile ? 330 : 530}
            height={isMobile ? 400 : 600}
            style={{
              width: isMobile ? '330px' : '530px',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>
      </section>

      {/* Why it works - Light Yellow #FAF7BF */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* Yellow Card - плашка на белом фоне */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#FAF7BF',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '40px' : '40px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '10px' : '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            lineHeight: isMobile ? '1.0' : '1.2'
          }}>
            {t.whyWorksTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '20px' : '40px',
            marginTop: '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            maxWidth: isMobile ? '100%' : '838px'
          }}>
            {t.whyWorksSubtitle}
          </p>

          {/* Desktop version - сложная структура с плашками и иллюстрациями */}
          {!isMobile ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '30px',
              position: 'relative'
            }}>
              {/* Left illustration - man 1.png на высоте белой плашки */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: '20px'
              }}>
                <Image
                  src="/Img/Website/man 1.png"
                  alt="Man 1"
                  width={108}
                  height={108}
                  style={{
                    width: '108px',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* Central white card with inner cards */}
              <div style={{
                width: '490px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative'
              }}>
                {/* 1. White card with border */}
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid #3A2E1F',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'left'
                }}>
                  <p style={{
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#3A2E1F',
                    margin: 0
                  }}>
                    {t.whyWorksOld}
                  </p>
                </div>

                {/* 2. Blue card #BFC2FF */}
                <div style={{
                  backgroundColor: '#BFC2FF',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'left'
                }}>
                  <p style={{
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#3A2E1F',
                    margin: 0
                  }}>
                    {t.whyWorksNew}
                  </p>
                </div>

                {/* 3. Blue card #BFC2FF */}
                <div style={{
                  backgroundColor: '#BFC2FF',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'left'
                }}>
                  <p style={{
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#3A2E1F',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {t.whyWorksNew2}
                  </p>
                </div>
              </div>

              {/* Right illustration - man 2.png на уровне первой зеленой плашки */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: '100px' // Высота белой плашки (20px padding + ~24px текст + 20px padding = ~64px) + gap 16px = 100px от верха
              }}>
                <Image
                  src="/Img/Website/man 2.png"
                  alt="Man 2"
                  width={108}
                  height={108}
                  style={{
                    width: '108px',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          ) : (
            /* Mobile version - упрощенная структура */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '20px',
              padding: '0 10px'
            }}>
              {/* Man 1 над белой плашкой, выравнивание слева */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '-8px'
              }}>
                <Image
                  src="/Img/Website/man 1.png"
                  alt="Man 1"
                  width={108}
                  height={108}
                  style={{
                    width: '108px',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* 1. White card with border */}
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #3A2E1F',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left'
              }}>
                <p style={{
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#3A2E1F',
                  margin: 0
                }}>
                  {t.whyWorksOld}
                </p>
              </div>

              {/* Man 2 над первой зеленой плашкой, выравнивание справа */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '-8px'
              }}>
                <Image
                  src="/Img/Website/man 2.png"
                  alt="Man 2"
                  width={108}
                  height={108}
                  style={{
                    width: '108px',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* 2. Blue card #BFC2FF */}
              <div style={{
                backgroundColor: '#BFC2FF',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left'
              }}>
                <p style={{
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#3A2E1F',
                  margin: 0
                }}>
                  {t.whyWorksNew}
                </p>
              </div>

              {/* 3. Blue card #BFC2FF */}
              <div style={{
                backgroundColor: '#BFC2FF',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left'
              }}>
                <p style={{
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#3A2E1F',
                  margin: 0,
                  whiteSpace: 'pre-line'
                }}>
                  {t.whyWorksNew2}
                </p>
              </div>
            </div>
          )}

          {/* Illustration 4block tags.svg - под зеленым блоком */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: isMobile ? '20px' : '30px',
            padding: isMobile ? '0 10px' : '0'
          }}>
            <Image
              src={appLanguage === 'ru' 
                ? (isMobile ? "/Img/Website/4block tags mob RU.svg" : "/Img/Website/4block tags RU.svg")
                : "/Img/Website/4block tags.svg"}
              alt="Tags illustration"
              width={isMobile ? 330 : 580}
              height={isMobile ? 200 : 400}
              style={{
                width: isMobile ? '100%' : '580px',
                maxWidth: isMobile ? '330px' : '580px',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Text under illustration */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '14px' : '16px', 
            fontWeight: 700, 
            color: '#3A2E1F',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            padding: isMobile ? '0 10px' : '0',
            marginBottom: '50px'
          }}>
            {t.whyWorksResult}
          </p>
        </div>
      </section>

      {/* How to use the course - Light Green #D5FDEC */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* Green Card - плашка на белом фоне */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#D5FDEC',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '40px' : '40px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '10px' : '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            lineHeight: isMobile ? '1.0' : '1.2'
          }}>
            {t.howToTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '20px' : '40px',
            marginTop: '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
          }}>
            {t.howToSubtitle}
          </p>

          {/* Desktop version - три колонки */}
          {!isMobile ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '20px', 
              marginBottom: '50px',
              padding: '0 30px',
              alignItems: 'flex-start'
            }}>
              {/* Колонка 1 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '16px',
                height: '100%'
              }}>
                {/* Иконка - фиксированная высота для выравнивания */}
                <div style={{
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804730.svg"
                    alt="Step 1 icon"
                    width={36}
                    height={36}
                    style={{ 
                      width: '36px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: '#3A2E1F',
                  textAlign: 'center',
                  margin: 0,
                  marginTop: isMobile ? '-20px' : '-20px',
                  marginBottom: isMobile ? '0px' : '30px',
                  maxWidth: '180px',
                  lineHeight: '1.2'
                }}>
                  {t.step1Title}
                </p>
                {/* Иллюстрация - фиксированная высота для выравнивания */}
                <div style={{
                  height: '168px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  marginTop: isMobile ? '40px' : '60px'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804726.svg"
                    alt="Step 1 illustration"
                    width={193}
                    height={193}
                    style={{ 
                      width: '193px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Колонка 2 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '16px',
                height: '100%'
              }}>
                {/* Иконка - фиксированная высота для выравнивания */}
                <div style={{
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804731.svg"
                    alt="Step 2 icon"
                    width={54}
                    height={54}
                    style={{ 
                      width: '54px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: '#3A2E1F',
                  textAlign: 'center',
                  margin: 0,
                  marginTop: isMobile ? '-20px' : '-20px',
                  marginBottom: isMobile ? '0px' : '30px',
                  maxWidth: '180px',
                  lineHeight: '1.2'
                }}>
                  {t.step2Title}
                </p>
                {/* Иллюстрация - фиксированная высота для выравнивания */}
                <div style={{
                  height: '168px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  marginTop: isMobile ? '40px' : '60px'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804727.svg"
                    alt="Step 2 illustration"
                    width={193}
                    height={193}
                    style={{ 
                      width: '193px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Колонка 3 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '16px',
                height: '100%'
              }}>
                {/* Иконка - фиксированная высота для выравнивания */}
                <div style={{
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804732.svg"
                    alt="Step 3 icon"
                    width={38}
                    height={38}
                    style={{ 
                      width: '38px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <p style={{ 
                  fontFamily: 'var(--font-tiktok)', 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: '#3A2E1F',
                  textAlign: 'center',
                  margin: 0,
                  marginTop: isMobile ? '-20px' : '-20px',
                  marginBottom: isMobile ? '0px' : '30px',
                  maxWidth: '180px',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.2'
                }}>
                  {t.step3Title.replace('Let the phrases settle.', 'Let the phrases\nsettle.')}
                </p>
                {/* Иллюстрация - фиксированная высота для выравнивания */}
                <div style={{
                  height: '168px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  marginTop: isMobile ? '40px' : '60px'
                }}>
                  <Image
                    src="/Img/Website/Group 1549804728.svg"
                    alt="Step 3 illustration"
                    width={193}
                    height={193}
                    style={{ 
                      width: '193px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Mobile version - упрощенная структура */
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px', 
              marginBottom: '20px',
              padding: '0 0 0 10px'
            }}>
              {/* Колонка 1 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Левая часть - иконка и заголовок */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flex: 1
                }}>
                  <Image
                    src="/Img/Website/Group 1549804730.svg"
                    alt="Step 1 icon"
                    width={36}
                    height={36}
                    style={{ 
                      width: '36px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                  <p style={{ 
                    fontFamily: 'var(--font-tiktok)', 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: '#3A2E1F',
                    textAlign: 'left',
                    margin: 0,
                    maxWidth: '140px',
                    lineHeight: '1.2'
                  }}>
                    {t.step1Title}
                  </p>
                </div>
                {/* Правая часть - иллюстрация */}
                <div style={{
                  flexShrink: 0
                }}>
                  <Image
                    src="/Img/Website/Group 1549804726.svg"
                    alt="Step 1 illustration"
                    width={164}
                    height={164}
                    style={{ 
                      width: '164px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Колонка 2 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Левая часть - иконка и заголовок */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flex: 1
                }}>
                  <Image
                    src="/Img/Website/Group 1549804731.svg"
                    alt="Step 2 icon"
                    width={43}
                    height={43}
                    style={{ 
                      width: '43px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                  <p style={{ 
                    fontFamily: 'var(--font-tiktok)', 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: '#3A2E1F',
                    textAlign: 'left',
                    margin: 0,
                    maxWidth: '140px',
                    lineHeight: '1.2'
                  }}>
                    {t.step2Title}
                  </p>
                </div>
                {/* Правая часть - иллюстрация */}
                <div style={{
                  flexShrink: 0
                }}>
                  <Image
                    src="/Img/Website/Group 1549804727.svg"
                    alt="Step 2 illustration"
                    width={164}
                    height={164}
                    style={{ 
                      width: '164px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Колонка 3 */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Левая часть - иконка и заголовок */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flex: 1
                }}>
                  <Image
                    src="/Img/Website/Group 1549804732.svg"
                    alt="Step 3 icon"
                    width={30}
                    height={30}
                    style={{ 
                      width: '30px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                  <p style={{ 
                    fontFamily: 'var(--font-tiktok)', 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: '#3A2E1F',
                    textAlign: 'left',
                    margin: 0,
                    maxWidth: '140px',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.2'
                  }}>
                    {t.step3Title.replace('Let the phrases settle.', 'Let the phrases\nsettle.')}
                  </p>
                </div>
                {/* Правая часть - иллюстрация */}
                <div style={{
                  flexShrink: 0
                }}>
                  <Image
                    src="/Img/Website/Group 1549804728.svg"
                    alt="Step 3 illustration"
                    width={164}
                    height={164}
                    style={{ 
                      width: '164px',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Text at the bottom */}
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '0 10px' : '0 30px',
            marginTop: isMobile ? '40px' : '0px'
          }}>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '19px' : '21px', 
              fontWeight: 700, 
              color: '#3A2E1F',
              marginBottom: '8px',
              marginTop: 0
            }}>
              {t.howToResult1}
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '15px' : '17px', 
              fontWeight: 700, 
              color: '#3A2E1F',
              marginTop: 0,
              marginBottom: isMobile ? '10px' : '40px'
            }}>
              {t.howToResult2}
            </p>
          </div>
        </div>
      </section>

      {/* What you will learn - White */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: isMobile ? '20px' : '70px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '40px' : '40px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '10px' : '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: 'center',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            lineHeight: isMobile ? '1.0' : '1.2'
          }}>
            {t.learnTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '20px' : '40px',
            marginTop: '0px',
            textAlign: 'center',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
          }}>
            {t.learnSubtitle}
          </p>

          {/* Illustration */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: isMobile ? '20px' : '30px',
            padding: isMobile ? '0 10px' : '0'
          }}>
            <Image
              src={appLanguage === 'ru'
                ? (isMobile ? '/Img/Website/6block tags mob RU.svg' : '/Img/Website/6block tags RU.svg')
                : (isMobile ? '/Img/Website/6block tags mob.svg' : '/Img/Website/6block tags.svg')}
              alt="What you will learn illustration"
              width={isMobile ? 389 : 868}
              height={isMobile ? 400 : 600}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Text content */}
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '0 10px' : '0 30px'
          }}>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: 700, 
              color: '#3A2E1F',
              textAlign: 'center',
              marginBottom: '8px',
              marginTop: 0
            }}>
              {t.learnPhrases}
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '14px' : '16px', 
              fontWeight: 400, 
              color: '#3A2E1F',
              textAlign: 'center',
              marginTop: 0,
              marginBottom: isMobile ? '50px' : '70px'
            }}>
              {t.learnWords}
            </p>
          </div>
        </div>
      </section>

      {/* Start for free - Black */}
      <section id="start-free" style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* Black Card - плашка на белом фоне */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#000',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '40px' : '40px', 
            fontWeight: 400, 
            color: '#fff', 
            marginBottom: isMobile ? '10px' : '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: 'center',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px',
            lineHeight: isMobile ? '1.0' : '1.2'
          }}>
            {t.startFreeTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#fff', 
            marginBottom: isMobile ? '20px' : '40px',
            marginTop: '0px',
            textAlign: 'center',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
          }}>
            {t.startFreeSubtitle}
          </p>

          {/* Inner black card with border */}
          <div style={{
            width: isMobile ? '100%' : '330px',
            maxWidth: isMobile ? '100%' : '330px',
            backgroundColor: '#000',
            border: '1px solid #8A8A8A',
            borderRadius: '12px',
            padding: isMobile ? '20px' : '24px',
            margin: '0 auto',
            marginBottom: '30px'
          }}>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '14px' : '16px', 
              fontWeight: 500, 
              color: '#fff',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {t.startFreeDesc}
            </p>
            <ul style={{ 
              marginBottom: '20px', 
              paddingLeft: '0px',
              textAlign: 'center',
              listStyle: 'none'
            }}>
              <li style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: 400, 
                color: '#fff',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                • {t.startFreeItem1}
              </li>
              <li style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: 400, 
                color: '#fff',
                textAlign: 'center'
              }}>
                • {t.startFreeItem2}
              </li>
            </ul>

            <form onSubmit={handleSubmit} style={{ marginBottom: '0' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#fff',
                  color: '#000',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 400,
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ color: '#ff0000', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#96F493',
                  color: '#000',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? '...' : t.startFreeButton}
              </button>
            </form>
          </div>

          {/* Text at the bottom */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '14px' : '16px', 
            fontWeight: 400, 
            color: '#fff',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            padding: isMobile ? '0 10px' : '0 30px',
            marginTop: isMobile ? '30px' : '0px',
            marginBottom: isMobile ? '10px' : '40px'
          }}>
            {t.startFreeEndText}
          </p>
        </div>
      </section>

      {/* FAQ - Between Start for Free and About */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px 20px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: isMobile ? '10px' : '0px',
        marginBottom: isMobile ? '10px' : '0px'
      }}>
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#F2F2F2',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 30px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          {/* Two columns layout - same spirit as About/Contact */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '20px' : '40px',
            alignItems: 'flex-start'
          }}>
            {/* Left column - Title */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: isMobile ? '1' : '0 0 calc(50% + 10px)',
              width: isMobile ? '100%' : 'calc(50% + 10px)',
              paddingRight: isMobile ? '0px' : '20px'
            }}>
              <h2 style={{ 
                fontFamily: 'var(--font-orelega)', 
                fontSize: isMobile ? '38px' : '48px', 
                fontWeight: 400, 
                color: '#3A2E1F', 
                marginBottom: '0px',
                marginTop: isMobile ? '30px' : '0px',
                textAlign: isMobile ? 'center' : 'left',
                paddingLeft: isMobile ? '0px' : '30px',
                paddingRight: isMobile ? '0px' : '30px',
                lineHeight: '1.1'
              }}>
                {t.faqTitle}
              </h2>
            </div>

            {/* Right column - Accordion */}
            <div style={{
              flex: isMobile ? '1' : '0 0 50%',
              width: isMobile ? '100%' : '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              paddingTop: isMobile ? '0px' : '0px',
              paddingLeft: isMobile ? '0px' : '0px',
              paddingRight: isMobile ? '0px' : '30px',
              paddingBottom: isMobile ? '0px' : '0px',
              marginLeft: isMobile ? '0px' : '-30px',
              marginBottom: '30px'
            }}>
              <div style={{ width: '100%', paddingLeft: isMobile ? '0px' : '30px' }}>
                {(t.faqItems || []).map((item: any, idx: number) => {
                  const open = faqOpenIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #D1D5DB',
                        padding: '16px 16px',
                        marginBottom: '12px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setFaqOpenIndex(open ? -1 : idx)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-tiktok)',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#111',
                            lineHeight: '1.3',
                          }}
                        >
                          {item.q}
                        </div>
                        <div style={{ flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </button>

                      {open && (
                        <div
                          style={{
                            marginTop: '12px',
                            fontFamily: 'var(--font-tiktok)',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#111',
                            lineHeight: '1.55',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About the Creator - White */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* White Card with black border - плашка на белом фоне */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#fff',
          border: '1px solid #000',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          {/* Two columns layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '20px' : '40px',
            alignItems: 'flex-start'
          }}>
            {/* First column - Image, Title, Subtitle - 50% width */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: isMobile ? '1' : '0 0 calc(50% + 10px)',
              width: isMobile ? '100%' : 'calc(50% + 10px)',
              paddingRight: isMobile ? '0px' : '20px'
            }}>
              {/* Image - выровнено по левой стороне */}
              <div style={{
                marginTop: '40px',
                marginBottom: '30px',
                display: 'flex',
                justifyContent: 'flex-start',
                paddingLeft: isMobile ? '20px' : '30px'
              }}>
                <Image
                  src="/Img/Website/yes.svg"
                  alt="Creator"
                  width={isMobile ? 120 : 150}
                  height={isMobile ? 120 : 150}
                  style={{ 
                    borderRadius: '50%',
                    width: isMobile ? '120px' : '150px',
                    height: isMobile ? '120px' : '150px',
                    objectFit: 'cover'
                  }}
                />
              </div>

              {/* Title */}
              <h2 style={{ 
                fontFamily: 'var(--font-orelega)', 
                fontSize: isMobile ? '38px' : '48px', 
                fontWeight: 400, 
                color: '#3A2E1F', 
                marginBottom: '16px',
                marginTop: '0px',
                textAlign: 'left',
                paddingLeft: isMobile ? '20px' : '30px',
                paddingRight: isMobile ? '20px' : '30px',
                lineHeight: '1.1'
              }}>
                {t.aboutTitle}
              </h2>

              {/* Subtitle - 14px desktop, 18px mobile */}
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: isMobile ? '18px' : '14px', 
                fontWeight: 500, 
                color: '#3A2E1F', 
                marginBottom: '0px',
                marginTop: '0px',
                textAlign: 'left',
                lineHeight: '1.4',
                paddingLeft: isMobile ? '20px' : '30px',
                paddingRight: isMobile ? '20px' : '40px'
              }}>
                {t.aboutSubtitle}
              </p>
            </div>

            {/* Second column - Text 14px - 50% width */}
            <div style={{
              flex: isMobile ? '1' : '0 0 50%',
              width: isMobile ? '100%' : '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              paddingTop: isMobile ? '0px' : '220px',
              paddingLeft: isMobile ? '0px' : '0px',
              paddingRight: isMobile ? '0px' : '30px',
              paddingBottom: isMobile ? '0px' : '40px',
              marginLeft: isMobile ? '0px' : '-30px'
            }}>
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: isMobile ? '14px' : '14px', 
                fontWeight: 400, 
                color: '#3A2E1F',
                lineHeight: '1.6',
                marginBottom: '0px',
                marginTop: '0px',
                textAlign: 'left',
                whiteSpace: 'pre-line',
                paddingLeft: isMobile ? '20px' : '30px',
                paddingRight: isMobile ? '20px' : '0px',
                paddingBottom: isMobile ? '30px' : '0px'
              }}>
                {t.aboutText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact - Write a message to FaloClaro */}
      <section style={{ 
        backgroundColor: '#fff', 
        padding: isMobile ? '10px 20px' : '10px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: isMobile ? '10px' : '0px',
        marginBottom: isMobile ? '10px' : '0px'
      }}>
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          backgroundColor: '#F2F2F2',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 30px 20px',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          {/* Two columns layout - same as About the Creator */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '20px' : '40px',
            alignItems: 'flex-start'
          }}>
            {/* First column - Title - same width as About the Creator first column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: isMobile ? '1' : '0 0 calc(50% + 10px)',
              width: isMobile ? '100%' : 'calc(50% + 10px)',
              paddingRight: isMobile ? '0px' : '20px'
            }}>
              {/* Title - same font size as "I built FaloClaro for myself" */}
              <h2 style={{ 
                fontFamily: 'var(--font-orelega)', 
                fontSize: isMobile ? '38px' : '48px', 
                fontWeight: 400, 
                color: '#3A2E1F', 
                marginBottom: '0px',
                marginTop: isMobile ? '30px' : '0px',
                textAlign: isMobile ? 'center' : 'left',
                paddingLeft: isMobile ? '0px' : '30px',
                paddingRight: isMobile ? '0px' : '30px',
                lineHeight: '1.1'
              }}>
                {t.contactTitle}
              </h2>
            </div>

            {/* Second column - Form - same width as About the Creator second column */}
            <div style={{
              flex: isMobile ? '1' : '0 0 50%',
              width: isMobile ? '100%' : '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              paddingTop: isMobile ? '0px' : '0px',
              paddingLeft: isMobile ? '0px' : '0px',
              paddingRight: isMobile ? '0px' : '30px',
              paddingBottom: isMobile ? '0px' : '0px',
              marginLeft: isMobile ? '0px' : '-30px',
              marginBottom: '30px'
            }}>
              {/* Form container - aligned with title in desktop */}
              <form style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
                paddingLeft: isMobile ? '0px' : '30px'
              }}>
              <textarea
                placeholder="Your message..."
                required
                rows={isMobile ? 6 : 8}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '16px',
                  fontWeight: 400,
                  marginBottom: '0px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  backgroundColor: '#fff'
                }}
              />
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '16px',
                  fontWeight: 400,
                  marginBottom: '0px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff'
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#000',
                  color: '#fff',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '0px'
                }}
              >
                {t.contactButton}
              </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: isMobile ? '20px' : '40px',
          }}
          onClick={closeSuccessPopup}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: isMobile ? '24px' : '40px',
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeSuccessPopup}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ×
            </button>

            <div className="mb-6">
              <Image
                src="/Img/Website/logo.svg"
                alt="FaloClaro"
                width={120}
                height={40}
                className="h-10 w-auto mx-auto"
              />
            </div>
            <h1 style={{ 
              fontFamily: 'var(--font-orelega)', 
              fontSize: isMobile ? '20px' : '24px', 
              fontWeight: 400, 
              marginBottom: '16px', 
              color: '#000' 
            }}>
              {t.successMessage}
            </h1>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '14px' : '16px', 
              color: '#666' 
            }}>
              {t.successSubtext}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
