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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      aboutText: 'I\'m an entrepreneur, not a teacher. I built this course because I needed it myself. Simple. Repetitive. Human. Not school. Not grammar book.',
      aboutText2: 'Obrigado - and welcome!',
      
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
        padding: isMobile ? '10px' : '40px 20px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#fff'
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
          maxWidth: isMobile ? '100%' : '868px',
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
            fontSize: isMobile ? '32px' : '48px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '12px' : '16px',
            lineHeight: '1.2',
            textAlign: 'center'
          }}>
            {t.heroTitle}
          </h1>
          
          {/* Hero Subtitle - Medium weight */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '18px' : '24px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '16px' : '20px',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            {t.heroSubtitle}
          </p>

          {/* Hero Description - Regular weight, 16px */}
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: isMobile ? '14px' : '16px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: isMobile ? '20px' : '24px',
            lineHeight: '1.5',
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
              marginTop: isMobile ? '24px' : '54px',
              marginBottom: '0',
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
              height: '62px', // Updated to 62px
              backgroundColor: '#000',
              borderRadius: '10px',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative'
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
      <section style={{ backgroundColor: '#fff', padding: isMobile ? '10px' : '60px 20px', display: 'flex', justifyContent: 'center' }}>
        {/* Pink Card - 868px width with rounded corners */}
        <div style={{ 
          width: isMobile ? '100%' : '868px',
          maxWidth: isMobile ? '100%' : '868px',
          backgroundColor: '#FFE3E3',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '10px' : '40px 20px 20px 20px'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: isMobile ? '32px' : '40px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '0px',
            textAlign: isMobile ? 'center' : 'left',
            paddingLeft: isMobile ? '10px' : '30px',
            paddingRight: isMobile ? '10px' : '30px'
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
            paddingLeft: isMobile ? '10px' : '30px',
            paddingRight: isMobile ? '10px' : '30px'
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
            <div style={{
              width: isMobile ? '100%' : 'auto',
              height: isMobile ? 'auto' : 'auto',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: isMobile ? '24px 24px 24px 30px' : '24px 24px 24px 30px',
              display: 'flex',
              flexDirection: 'row',
              gap: isMobile ? '12px' : '16px'
            }}>
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
                  onClick={() => router.push('/pt/course')}
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
                    alignSelf: 'flex-start'
                  }}
                >
                  {t.courseButton}
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
                  width={isMobile ? 100 : 129}
                  height={isMobile ? 150 : 259}
                  style={{ 
                    width: isMobile ? '100px' : '129px',
                    height: isMobile ? '150px' : '259px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>

            {/* The Trainer - White Card */}
            <div style={{
              width: isMobile ? '100%' : 'auto',
              height: isMobile ? 'auto' : 'auto',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: isMobile ? '24px 24px 24px 30px' : '24px 24px 24px 30px',
              display: 'flex',
              flexDirection: 'row',
              gap: isMobile ? '12px' : '16px'
            }}>
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
                  onClick={() => router.push('/player')}
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
                    alignSelf: 'flex-start'
                  }}
                >
                  {t.trainerButton}
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
                  width={isMobile ? 100 : 129}
                  height={isMobile ? 150 : 259}
                  style={{ 
                    width: isMobile ? '100px' : '129px',
                    height: isMobile ? '150px' : '259px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why it works - Light Yellow #FAF7BF */}
      <section style={{ backgroundColor: '#FAF7BF', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {t.whyWorksTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            {t.whyWorksSubtitle}
          </p>

          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <Image
                src="/Img/Website/Group 1549804704.svg"
                alt="Confused"
                width={60}
                height={60}
              />
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '16px', 
                fontWeight: 400, 
                color: '#3A2E1F',
                flex: 1
              }}>
                {t.whyWorksOld}
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#BDF6BB', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <Image
                src="/Img/Website/Group 1549804705.svg"
                alt="Lightbulb"
                width={60}
                height={60}
              />
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '16px', 
                fontWeight: 400, 
                color: '#3A2E1F',
                flex: 1
              }}>
                {t.whyWorksNew}
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#BDF6BB', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '30px'
            }}>
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '16px', 
                fontWeight: 400, 
                color: '#3A2E1F'
              }}>
                {t.whyWorksNew2}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {t.whyWorksActions.map((action, index) => (
              <button
                key={index}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: index === 1 ? '#45C240' : '#BDF6BB',
                  color: '#3A2E1F',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {action}
              </button>
            ))}
          </div>

          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '16px', 
            fontWeight: 500, 
            color: '#3A2E1F',
            textAlign: 'center'
          }}>
            {t.whyWorksResult}
          </p>
        </div>
      </section>

      {/* How to use the course - Light Green #D5FDEC */}
      <section style={{ backgroundColor: '#D5FDEC', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {t.howToTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            {t.howToSubtitle}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <Image
                src="/Img/Website/Group 1549804706.svg"
                alt="Step 1"
                width={40}
                height={40}
                style={{ margin: '0 auto 12px' }}
              />
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#3A2E1F',
                marginBottom: '12px'
              }}>
                {t.step1Title}
              </p>
              <Image
                src="/Img/Website/Phone.svg"
                alt="Step 1 Phone"
                width={100}
                height={200}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <Image
                src="/Img/Website/Group 1549804707.svg"
                alt="Step 2"
                width={40}
                height={40}
                style={{ margin: '0 auto 12px' }}
              />
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#3A2E1F',
                marginBottom: '12px'
              }}>
                {t.step2Title}
              </p>
              <Image
                src="/Img/Website/Phone-1.svg"
                alt="Step 2 Phone"
                width={100}
                height={200}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <Image
                src="/Img/Website/Group 1549804708.svg"
                alt="Step 3"
                width={40}
                height={40}
                style={{ margin: '0 auto 12px' }}
              />
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#3A2E1F',
                marginBottom: '12px'
              }}>
                {t.step3Title}
              </p>
              <Image
                src="/Img/Website/Phone.svg"
                alt="Step 3 Phone"
                width={100}
                height={200}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>

          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '16px', 
            fontWeight: 500, 
            color: '#3A2E1F',
            textAlign: 'center'
          }}>
            {t.howToResult}
          </p>
        </div>
      </section>

      {/* What you will learn - White */}
      <section style={{ backgroundColor: '#fff', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {t.learnTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            {t.learnSubtitle}
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px', 
            marginBottom: '30px'
          }}>
            {t.learnTopics.map((topic, index) => {
              const colors = ['#3B82F6', '#FFE3E3', '#FFA500', '#9B59B6', '#3B82F6', '#FFA500', '#FFE3E3', '#9B59B6'];
              return (
                <div
                  key={index}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: colors[index],
                    textAlign: 'center',
                  }}
                >
                  <p style={{ 
                    fontFamily: 'var(--font-tiktok)', 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#3A2E1F'
                  }}>
                    {topic}
                  </p>
                </div>
              );
            })}
          </div>

          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '18px', 
            fontWeight: 700, 
            color: '#3A2E1F',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            {t.learnPhrases}
          </p>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '14px', 
            fontWeight: 400, 
            color: '#666',
            textAlign: 'center'
          }}>
            {t.learnWords}
          </p>
        </div>
      </section>

      {/* Start for free - Black */}
      <section style={{ backgroundColor: '#000', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#fff', 
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {t.startFreeTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#fff', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            {t.startFreeSubtitle}
          </p>

          <div style={{ 
            backgroundColor: '#fff', 
            padding: '24px', 
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '16px', 
              fontWeight: 500, 
              color: '#3A2E1F',
              marginBottom: '16px'
            }}>
              {t.startFreeDesc}
            </p>
            <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
              <li style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '14px', 
                fontWeight: 400, 
                color: '#3A2E1F',
                marginBottom: '8px'
              }}>
                {t.startFreeItem1}
              </li>
              <li style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '14px', 
                fontWeight: 400, 
                color: '#3A2E1F'
              }}>
                {t.startFreeItem2}
              </li>
            </ul>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ color: '#ff0000', fontSize: '14px', marginBottom: '12px' }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#96F493',
                  color: '#000',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? '...' : t.startFreeButton}
              </button>
            </form>
          </div>

          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '12px', 
            fontWeight: 400, 
            color: '#fff',
            textAlign: 'center'
          }}>
            {t.startFreeNote}
          </p>
        </div>
      </section>

      {/* About the Creator - White */}
      <section style={{ backgroundColor: '#fff', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Image
              src="/Img/Website/Mask group.png"
              alt="Creator"
              width={120}
              height={120}
              style={{ borderRadius: '50%', marginBottom: '20px' }}
            />
          </div>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '32px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {t.aboutTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '18px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {t.aboutSubtitle}
          </p>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '16px', 
            fontWeight: 400, 
            color: '#3A2E1F',
            lineHeight: '1.6',
            marginBottom: '16px'
          }}>
            {t.aboutText}
          </p>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '18px', 
            fontWeight: 700, 
            color: '#3A2E1F',
            textAlign: 'center'
          }}>
            {t.aboutText2}
          </p>
        </div>
      </section>

      {/* Contact - Light Gray */}
      <section style={{ backgroundColor: '#f5f5f5', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '868px' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            {t.contactTitle}
          </h2>
          <form>
            <textarea
              placeholder="Your message..."
              required
              rows={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontFamily: 'var(--font-tiktok)',
                fontSize: '16px',
                fontWeight: 400,
                marginBottom: '12px',
                boxSizing: 'border-box',
                resize: 'vertical',
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
              }}
            >
              {t.contactButton}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
