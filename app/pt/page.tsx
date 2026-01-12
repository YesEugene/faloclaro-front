'use client';

import { useState } from 'react';
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
      courseDesc: '60 short lessons',
      courseDesc2: '1-2 lessons per day',
      courseDesc3: '10-20 minutes a day',
      courseButton: 'Start',
      trainerTitle: 'The Trainer',
      trainerDesc: 'Phrase-repetition space',
      trainerDesc2: 'Choose a topic',
      trainerDesc3: 'Choose words or sentences',
      trainerDesc4: 'Listen and repeat',
      trainerButton: 'Start',
      trainerNote: 'The trainer is open and free',
      courseNote: 'The course gives you direction',
      
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
      courseDesc: '60 lições curtas',
      courseDesc2: '1-2 lições por dia',
      courseDesc3: '10-20 minutos por dia',
      courseButton: 'Começar',
      trainerTitle: 'O Treinador',
      trainerDesc: 'Espaço de repetição de frases',
      trainerDesc2: 'Escolhe um tópico',
      trainerDesc3: 'Escolhe palavras ou frases',
      trainerDesc4: 'Ouve e repete',
      trainerButton: 'Começar',
      trainerNote: 'O treinador está aberto e grátis',
      courseNote: 'O curso dá-te direção',
      
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
      courseDesc: '60 коротких уроков',
      courseDesc2: '1-2 урока в день',
      courseDesc3: '10-20 минут в день',
      courseButton: 'Начать',
      trainerTitle: 'Тренажер',
      trainerDesc: 'Пространство для повторения фраз',
      trainerDesc2: 'Выбери тему',
      trainerDesc3: 'Выбери слова или предложения',
      trainerDesc4: 'Слушай и повторяй',
      trainerButton: 'Начать',
      trainerNote: 'Тренажер открыт и бесплатен',
      courseNote: 'Курс дает направление',
      
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
        padding: '40px 20px', 
        display: 'flex', 
        justifyContent: 'center',
        backgroundColor: '#fff'
      }}>
        <div style={{ 
          width: '500px',
          height: '868px',
          backgroundColor: '#BDF6BB',
          borderRadius: '16px',
          padding: '40px 30px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header with Logo and Language Selector */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '40px'
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

          {/* Centered Content */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            {/* Hero Title */}
            <h1 style={{ 
              fontFamily: 'var(--font-orelega)', 
              fontSize: '48px', 
              fontWeight: 400, 
              color: '#3A2E1F', 
              marginBottom: '16px',
              lineHeight: '1.2',
              textAlign: 'center'
            }}>
              {t.heroTitle}
            </h1>
            
            {/* Hero Subtitle */}
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '24px', 
              fontWeight: 400, 
              color: '#3A2E1F', 
              marginBottom: '20px',
              lineHeight: '1.4',
              textAlign: 'center'
            }}>
              {t.heroSubtitle}
            </p>

            {/* Hero Description */}
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '16px', 
              fontWeight: 400, 
              color: '#3A2E1F', 
              marginBottom: '24px',
              lineHeight: '1.5',
              textAlign: 'center'
            }}>
              {t.heroDescription}
            </p>

            {/* CTA Text */}
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '16px', 
              fontWeight: 500, 
              color: '#3A2E1F', 
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {t.heroCta}
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '16px', 
              fontWeight: 500, 
              color: '#3A2E1F', 
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              {t.heroCtaSub}
            </p>

            {/* Email Form - Centered */}
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '440px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: '16px',
                    fontWeight: 400,
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FFD700',
                    color: '#000',
                    fontFamily: 'var(--font-tiktok)',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSubmitting ? '...' : t.buttonStart}
                </button>
              </div>
              {error && (
                <div style={{ color: '#ff0000', fontSize: '14px', marginBottom: '8px', textAlign: 'center' }}>{error}</div>
              )}
            </form>

            {/* Disclaimer - Centered */}
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '12px', 
              fontWeight: 400, 
              color: '#3A2E1F',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {t.disclaimer}
            </p>
            <p style={{ 
              fontFamily: 'var(--font-tiktok)', 
              fontSize: '12px', 
              fontWeight: 400, 
              color: '#3A2E1F',
              textAlign: 'center'
            }}>
              {t.noCard}
            </p>
          </div>
        </div>
      </section>

      {/* What is FaloClaro - Light Pink #FFE3E3 */}
      <section style={{ backgroundColor: '#FFE3E3', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-orelega)', 
            fontSize: '36px', 
            fontWeight: 400, 
            color: '#3A2E1F', 
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {t.whatIsTitle}
          </h2>
          <p style={{ 
            fontFamily: 'var(--font-tiktok)', 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#3A2E1F', 
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            {t.whatIsSubtitle}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* The Course */}
            <div>
              <h3 style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '18px', 
                fontWeight: 700, 
                color: '#3A2E1F', 
                marginBottom: '12px'
              }}>
                {t.courseTitle}
              </h3>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '8px' }}>
                {t.courseDesc}
              </p>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '8px' }}>
                {t.courseDesc2}
              </p>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '16px' }}>
                {t.courseDesc3}
              </p>
              <Image
                src="/Img/Website/Phone.svg"
                alt="Course"
                width={150}
                height={300}
                style={{ width: '100%', height: 'auto', marginBottom: '12px' }}
              />
              <button
                onClick={() => router.push('/pt/course')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#45C240',
                  color: '#fff',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.courseButton}
              </button>
            </div>

            {/* The Trainer */}
            <div>
              <h3 style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '18px', 
                fontWeight: 700, 
                color: '#3A2E1F', 
                marginBottom: '12px'
              }}>
                {t.trainerTitle}
              </h3>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '8px' }}>
                {t.trainerDesc}
              </p>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '8px' }}>
                {t.trainerDesc2}
              </p>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '8px' }}>
                {t.trainerDesc3}
              </p>
              <p style={{ fontFamily: 'var(--font-tiktok)', fontSize: '14px', fontWeight: 400, color: '#3A2E1F', marginBottom: '16px' }}>
                {t.trainerDesc4}
              </p>
              <Image
                src="/Img/Website/Phone-1.svg"
                alt="Trainer"
                width={150}
                height={300}
                style={{ width: '100%', height: 'auto', marginBottom: '12px' }}
              />
              <button
                onClick={() => router.push('/player')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  fontFamily: 'var(--font-tiktok)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.trainerButton}
              </button>
            </div>
          </div>

          {/* Connecting Notes */}
          <div style={{ position: 'relative', height: '60px', marginTop: '20px' }}>
            <div style={{ position: 'absolute', left: '10%', top: '50%', transform: 'translateY(-50%)' }}>
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '12px', 
                fontWeight: 500, 
                color: '#3A2E1F',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}>
                {t.trainerNote}
              </p>
            </div>
            <div style={{ position: 'absolute', right: '10%', top: '50%', transform: 'translateY(-50%)' }}>
              <p style={{ 
                fontFamily: 'var(--font-tiktok)', 
                fontSize: '12px', 
                fontWeight: 500, 
                color: '#3A2E1F',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed'
              }}>
                {t.courseNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why it works - Light Yellow #FAF7BF */}
      <section style={{ backgroundColor: '#FAF7BF', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
        <div style={{ maxWidth: '500px', width: '100%' }}>
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
