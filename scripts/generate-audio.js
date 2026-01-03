/**
 * Script to generate audio files for Portuguese phrases using Google Cloud TTS
 * 
 * Requirements:
 * 1. Install: npm install @google-cloud/text-to-speech
 * 2. Set up Google Cloud credentials: https://cloud.google.com/text-to-speech/docs/quickstart
 * 3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 
 * Usage:
 * node scripts/generate-audio.js
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const client = new textToSpeech.TextToSpeechClient();

// European Portuguese voice
const VOICE_CONFIG = {
  languageCode: 'pt-PT',
  name: 'pt-PT-Wavenet-B', // Female voice
  // Alternative: 'pt-PT-Wavenet-D' (Male voice)
  ssmlGender: 'FEMALE',
};

const OUTPUT_DIR = path.join(__dirname, '../audio-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateAudio(text, filename) {
  const request = {
    input: { text },
    voice: VOICE_CONFIG,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0, // Normal speed
      pitch: 0.0, // Normal pitch
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    
    console.log(`✅ Generated: ${filename}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
    return null;
  }
}

// Phrases to generate (first 100)
const phrases = [
  // Cluster 1: Reactions and Responses
  'Sim.', 'Não.', 'Talvez.', 'Claro.', 'Está bem.', 'Tudo bem.', 'Perfeito.', 'Exacto.', 'Pois.', 'Depende.',
  'Não sei.', 'Acho que sim.', 'Acho que não.', 'Pode ser.', 'Já vejo.', 'Vamos ver.', 'Com certeza.', 'Nem por isso.', 'É verdade.', 'Tens razão.',
  'Não acredito.', 'A sério?', 'Que pena.', 'Que bom.', 'Que estranho.', 'Faz sentido.', 'Não importa.', 'Não faz mal.', 'Tudo certo.', 'Está feito.',
  // Cluster 2: Politeness and Requests
  'Por favor.', 'Obrigada.', 'Muito obrigada.', 'De nada.', 'Com licença.', 'Desculpa.', 'Peço desculpa.', 'Pode ajudar-me?', 'Pode repetir?', 'Mais devagar, por favor.',
  'Pode esperar?', 'Um momento.', 'Já vou.', 'Já volto.', 'Não é preciso.', 'Está tudo bem.', 'Sem problema.', 'Se faz favor.', 'Pode ser agora?', 'Quando puder.',
  'Obrigada pela ajuda.', 'Lamento.', 'Desculpe o atraso.', 'Foi sem querer.', 'Não foi nada.',
  // Cluster 3: Understanding / Not Understanding
  'Não percebi.', 'Percebo.', 'Não entendo.', 'Agora percebo.', 'Mais ou menos.', 'Um pouco.', 'Não muito.', 'Tudo claro.', 'Não está claro.', 'Pode explicar?',
  'O que quer dizer?', 'Como assim?', 'Já entendi.', 'Não tenho a certeza.', 'Parece-me bem.', 'Não parece.', 'É diferente.', 'Faz diferença.', 'É igual.', 'É parecido.',
  // Cluster 4: Movement, Time, Pauses
  'Agora não.', 'Agora sim.', 'Mais tarde.', 'Hoje não.', 'Amanhã.', 'Depois.', 'Antes.', 'Já passou.', 'Ainda não.', 'Já está.',
  'Ainda há tempo.', 'Estou a chegar.', 'Estou a ir.', 'Estou aqui.', 'Já cheguei.', 'Fico aqui.', 'Vamos embora.', 'Volto já.', 'Sem pressa.', 'Com calma.',
  'Muito cedo.', 'Muito tarde.', 'A tempo.', 'Fora de horas.', 'Está perto.',
];

async function generateAll() {
  console.log(`Generating ${phrases.length} audio files...\n`);
  
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    // Create safe filename: replace special chars and spaces
    const filename = `phrase-${i + 1}-${phrase.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.mp3`;
    
    await generateAudio(phrase, filename);
    
    // Rate limiting: wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ All audio files generated in: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Upload files to Supabase Storage bucket "audio"');
  console.log('2. Update audio_url in phrases table');
}

// Run if called directly
if (require.main === module) {
  generateAll().catch(console.error);
}

module.exports = { generateAudio, generateAll };

