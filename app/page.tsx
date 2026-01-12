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
      heroTitle: 'Learn Portuguese for life.',
      heroSubtitle: 'Without stress. Without grammar overload.',
      heroDescription: 'FaloClaro is a 60-lesson micro-course that helps you start understanding and speaking real Portuguese — by training your ear, your memory and your intuition.',
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
      whyWorksSubtitle: 'We don\'t teach rules. We build reflexes.',
      whyWorksOld: 'Most language apps try to explain Portuguese.',
      whyWorksNew: 'FaloClaro trains your brain to recognize it, hear it and produce it.',
      whyWorksNew2: 'You don\'t start with grammar. You start with living phrases.',
      whyWorksActions: ['You repeat them', 'You say them', 'You hear them'],
      whyWorksResult: 'Until they stop feeling foreign. That\'s how real language is built.',
      
      howToTitle: 'How to use the course',
      howToSubtitle: 'One simple rule. Do 1-2 lessons per day. Not more.',
      step1Title: 'Learn a few phrases in the morning.',
      step2Title: 'Use the trainer during the day.',
      step3Title: 'Let the phrases settle.',
      howToResult: 'That\'s it. No pressure. No homework. Just real contact with the language.',
      
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
      
      aboutTitle: 'I built FaloClaro for myself.',
      aboutSubtitle: 'After two years in Portugal, I realized I wanted to really feel the language, not study it.',
      aboutText: 'I\'m an entrepreneur, and one of my main projects in the past was a large educational platform. So when I couldn\'t find a language format that actually worked for me, I did what I always did in EdTech: I built it, together with experienced linguists and language teachers.\n\nWe designed FaloClaro to be simple, calm, repetitive and human. Not a school. Not a grammar book. A way to let Portuguese slowly become part of your thinking.\n\nNow I\'m learning Portuguese with you.\n\nFaloClaro will keep growing, improving, and evolving as the language grows in my own head.\n\nObrigado — and welcome 🇵🇹',
      
      contactTitle: 'Write a message to FaloClaro',
      contactButton: 'Send',
      
      successMessage: 'We\'ve sent you the first lesson by email.',
      successSubtext: 'Check your email and click the link in the message.',
    },
    pt: {
      heroTitle: 'Aprende Português para a vida.',
      heroSubtitle: 'Sem stress. Sem sobrecarga de gramática.',
      heroDescription: 'FaloClaro é um micro-curso de 60 lições que te ajuda a começar a compreender e falar português real — treinando o teu ouvido, a tua memória e a tua intuição.',
      heroCta: 'Obtém 3 lições grátis.',
      heroCtaSub: 'Acesso instantâneo por email.',
      emailPlaceholder: 'O teu E-mail',
      buttonStart: 'Obter!',
      buttonLearnMore: 'Ou saber mais',
      disclaimer: 'Sem spam. Receberás um link pessoal para começar imediatamente.',
      noCard: 'Sem cartão de crédito necessário. Podes cancelar a qualquer momento.',
      
      whatIsTitle: 'O que é FaloClaro',
      whatIsSubtitle: 'Duas partes. Uma ideia.',
      courseTitle: 'O Curso',
      courseItems: [
        '60 lições curtas.',
        '5 tarefas por lição.',
        '15–20 minutos por dia.',
      ],
      courseDescription: 'Este é o caminho estruturado: moves-te de frases simples para situações reais, passo a passo.',
      courseButton: 'Começar',
      trainerTitle: 'O Treinador',
      trainerIntro: 'Um espaço de repetição de frases:',
      trainerItems: [
        'Escolhe um tópico',
        'Escolhe palavras ou frases',
        'Ouve e repete.',
      ],
      trainerDescription: 'É aqui que a língua se torna automática.',
      trainerButton: 'Começar',
      
      whyWorksTitle: 'Por que funciona',
      whyWorksSubtitle: 'Não ensinamos regras. Construímos reflexos.',
      whyWorksOld: 'A maioria das apps de línguas tenta explicar português.',
      whyWorksNew: 'FaloClaro treina o teu cérebro para reconhecer, ouvir e produzir.',
      whyWorksNew2: 'Não começas com gramática. Começas com frases vivas.',
      whyWorksActions: ['Repetes-as', 'Dizes-as', 'Ouvês-as'],
      whyWorksResult: 'Até deixarem de parecer estrangeiras. É assim que se constrói uma língua real.',
      
      howToTitle: 'Como usar o curso',
      howToSubtitle: 'Uma regra simples. Faz 1-2 lições por dia. Não mais.',
      step1Title: 'Aprende algumas frases de manhã.',
      step2Title: 'Usa o treinador durante o dia.',
      step3Title: 'Deixa as frases fixarem-se.',
      howToResult: 'É isso. Sem pressão. Sem trabalhos de casa. Apenas contacto real com a língua.',
      
      learnTitle: 'O que vais aprender',
      learnSubtitle: 'No curso treinas coisas que realmente precisas:',
      learnTopics: [
        'perguntar e responder',
        'polidez e pedidos',
        'preços e compras',
        'cafés e restaurantes',
        'hora e direções',
        'casa e vida quotidiana',
        'emoções e reações',
        'frases curtas e longas',
      ],
      learnPhrases: 'Cerca de 600 frases reais',
      learnWords: '2.500-3.000 palavras',
      
      startFreeTitle: 'Começa grátis',
      startFreeSubtitle: 'Não precisas de decidir agora.',
      startFreeDesc: 'Introduz o teu email e obtém:',
      startFreeItem1: '3 lições completas',
      startFreeItem2: 'Sem cartão de crédito necessário',
      startFreeButton: 'Experimenta 3 lições grátis.',
      startFreeNote: 'Sem spam. Sem preocupações. Podes cancelar a qualquer momento.',
      
      aboutTitle: 'Construí FaloClaro para mim.',
      aboutSubtitle: 'Após dois anos em Portugal, percebi que queria realmente sentir a língua, não estudá-la.',
      aboutText: 'Sou empreendedor, não professor. Construí este curso porque precisava dele. Simples. Repetitivo. Humano. Não escola. Não livro de gramática.',
      aboutText2: 'Obrigado - e bem-vindo!',
      
      contactTitle: 'Escreve uma mensagem para FaloClaro',
      contactButton: 'Enviar',
      
      successMessage: 'Enviamos-te a primeira lição por email.',
      successSubtext: 'Verifica o teu email e clica no link da mensagem.',
    },
    ru: {
      heroTitle: 'Изучай португальский для жизни.',
      heroSubtitle: 'Без стресса. Без перегрузки грамматикой.',
      heroDescription: 'FaloClaro — это микро-курс из 60 уроков, который помогает начать понимать и говорить на настоящем португальском — тренируя твой слух, память и интуицию.',
      heroCta: 'Получи 3 урока бесплатно.',
      heroCtaSub: 'Мгновенный доступ по email.',
      emailPlaceholder: 'Твой Email',
      buttonStart: 'Получить!',
      buttonLearnMore: 'Или узнать больше',
      disclaimer: 'Без спама. Ты получишь персональную ссылку для начала сразу.',
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
      whyWorksSubtitle: 'Мы не учим правилам. Мы строим рефлексы.',
      whyWorksOld: 'Большинство языковых приложений пытаются объяснить португальский.',
      whyWorksNew: 'FaloClaro тренирует твой мозг распознавать, слышать и производить его.',
      whyWorksNew2: 'Ты не начинаешь с грамматики. Ты начинаешь с живых фраз.',
      whyWorksActions: ['Ты их повторяешь', 'Ты их говоришь', 'Ты их слышишь'],
      whyWorksResult: 'Пока они не перестанут казаться чужими. Так строится настоящий язык.',
      
      howToTitle: 'Как использовать курс',
      howToSubtitle: 'Одно простое правило. Делай 1-2 урока в день. Не больше.',
      step1Title: 'Учи несколько фраз утром.',
      step2Title: 'Используй тренажер в течение дня.',
      step3Title: 'Дай фразам уложиться.',
      howToResult: 'Вот и всё. Без давления. Без домашних заданий. Просто реальный контакт с языком.',
      
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
      startFreeSubtitle: 'Тебе не нужно решать сейчас.',
      startFreeDesc: 'Введи email и получи:',
      startFreeItem1: '3 полных урока',
      startFreeItem2: 'Без карты',
      startFreeButton: 'Попробуй 3 урока бесплатно.',
      startFreeNote: 'Без спама. Без переживаний. Можно отменить в любой момент.',
      
      aboutTitle: 'Я создал FaloClaro для себя.',
      aboutSubtitle: 'После двух лет в Португалии я понял, что хочу действительно чувствовать язык, а не изучать его.',
      aboutText: 'Я предприниматель, а не учитель. Я создал этот курс, потому что он был мне нужен. Простой. Повторяющийся. Человечный. Не школа. Не учебник грамматики.',
      aboutText2: 'Obrigado - и добро пожаловать!',
      
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <div className="mb-6">
            <Image
              src="/Img/Website/logo.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto mx-auto"
            />
          </div>
          <h1 style={{ fontFamily: 'var(--font-orelega)', fontSize: '24px', fontWeight: 400, marginBottom: '16px', color: '#000' }}>{t.successMessage}</h1>
          <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '16px', color: '#666' }}>{t.successSubtext}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-tiktok)' }}>
      {/* Hero Section - Light Green #BDF6BB */}
      <section style={{ 
        padding: isMobile ? '10px' : '10px 20px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginTop: '0px',
        marginBottom: '0px',
        overflow: 'hidden'
      }}>
        {/* Header with Logo and Language Selector - ABOVE the card */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '100%' : '868px',
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

        {/* Main Card */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '389px' : '868px',
          height: isMobile ? 'auto' : '500px',
          minHeight: isMobile ? 'auto' : '500px',
          backgroundColor: '#BDF6BB',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '32px 24px' : '40px 50px',
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
            fontSize: isMobile ? '59px' : '48px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginTop: isMobile ? '0px' : '51px',
            marginBottom: isMobile ? '0px' : '11px',
            paddingTop: isMobile ? '13px' : '0px',
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
            marginTop: isMobile ? '0px' : '0px',
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
            textAlign: 'center'
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
                  width: isMobile ? '70px' : '74px',
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

          {/* Disclaimer - Regular weight, 10px */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '9px' : '10px', 
            fontWeight: 400, 
            color: '#3A2E1F',
            textAlign: 'center',
            padding: isMobile ? '0 16px' : '0'
          }}>
            {t.disclaimer}
          </p>
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
            marginBottom: '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
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
                  src="/Img/Website/Phone-1.svg"
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
                  src="/Img/Website/Phone.svg"
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
            marginBottom: '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
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
            paddingRight: isMobile ? '0px' : '30px'
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
                    Most language apps try to explain Portuguese
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
                    FaloClaro trains your brain to recognize it, hear it and produce it.
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
                    You don't start with grammar.{'\n'}You start with living phrases.
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
                  Most language apps try to explain Portuguese
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
                  FaloClaro trains your brain to recognize it, hear it and produce it.
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
                  You don't start with grammar.{'\n'}You start with living phrases.
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
              src="/Img/Website/4block tags.svg"
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
            Until they stop feeling foreign.{'\n'}That's how real language is built.
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
            marginBottom: '0px',
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
            marginBottom: isMobile ? '40px' : '40px',
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
              That's it.
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: isMobile ? '15px' : '17px', 
              fontWeight: 700, 
              color: '#3A2E1F',
              marginTop: 0,
              marginBottom: isMobile ? '10px' : '40px'
            }}>
              No pressure. No homework. Just real contact with the langua
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
            marginBottom: '0px',
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
              src={isMobile ? '/Img/Website/6block tags mob.svg' : '/Img/Website/6block tags.svg'}
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
            marginBottom: '0px',
            marginTop: isMobile ? '30px' : '0px',
            textAlign: 'center',
            paddingLeft: isMobile ? '0px' : '30px',
            paddingRight: isMobile ? '0px' : '30px'
          }}>
            {t.startFreeTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#fff', 
            marginBottom: isMobile ? '40px' : '40px',
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
            If you like the method,{'\n'}you can unlock all 60 lessons for $15
          </p>
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
                paddingLeft: isMobile ? '0px' : '30px'
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
                paddingLeft: isMobile ? '0px' : '30px',
                paddingRight: isMobile ? '0px' : '30px',
                lineHeight: '1.1'
              }}>
                {t.aboutTitle}
              </h2>

              {/* Subtitle - 24px */}
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: isMobile ? '18px' : '24px', 
                fontWeight: 500, 
                color: '#3A2E1F', 
                marginBottom: '0px',
                marginTop: '0px',
                textAlign: 'left',
                lineHeight: '1.4',
                paddingLeft: isMobile ? '0px' : '30px',
                paddingRight: isMobile ? '0px' : '40px'
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
                paddingLeft: isMobile ? '0px' : '30px',
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
    </div>
  );
}
