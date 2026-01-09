/**
 * Script to update audio_url in database after uploading files to Supabase Storage
 * 
 * This script generates SQL UPDATE statements based on phrase text and expected filename pattern
 * 
 * Usage:
 * node scripts/update-audio-urls.js > update-audio-urls.sql
 * Then run the SQL in Supabase SQL Editor
 */

const SUPABASE_URL = 'https://youvkbqaruadfpqxxbwi.supabase.co';
const STORAGE_BUCKET = 'audio';

// Map of phrases to their expected filenames
// Format: phrase-{number}-{sanitized-text}.mp3
const phrases = [
  // Cluster 1 (1-30)
  { text: 'Sim.', num: 1 },
  { text: 'Não.', num: 2 },
  { text: 'Talvez.', num: 3 },
  { text: 'Claro.', num: 4 },
  { text: 'Está bem.', num: 5 },
  { text: 'Tudo bem.', num: 6 },
  { text: 'Perfeito.', num: 7 },
  { text: 'Exacto.', num: 8 },
  { text: 'Pois.', num: 9 },
  { text: 'Depende.', num: 10 },
  { text: 'Não sei.', num: 11 },
  { text: 'Acho que sim.', num: 12 },
  { text: 'Acho que não.', num: 13 },
  { text: 'Pode ser.', num: 14 },
  { text: 'Já vejo.', num: 15 },
  { text: 'Vamos ver.', num: 16 },
  { text: 'Com certeza.', num: 17 },
  { text: 'Nem por isso.', num: 18 },
  { text: 'É verdade.', num: 19 },
  { text: 'Tens razão.', num: 20 },
  { text: 'Não acredito.', num: 21 },
  { text: 'A sério?', num: 22 },
  { text: 'Que pena.', num: 23 },
  { text: 'Que bom.', num: 24 },
  { text: 'Que estranho.', num: 25 },
  { text: 'Faz sentido.', num: 26 },
  { text: 'Não importa.', num: 27 },
  { text: 'Não faz mal.', num: 28 },
  { text: 'Tudo certo.', num: 29 },
  { text: 'Está feito.', num: 30 },
  // Cluster 2 (31-55)
  { text: 'Por favor.', num: 31 },
  { text: 'Obrigada.', num: 32 },
  { text: 'Muito obrigada.', num: 33 },
  { text: 'De nada.', num: 34 },
  { text: 'Com licença.', num: 35 },
  { text: 'Desculpa.', num: 36 },
  { text: 'Peço desculpa.', num: 37 },
  { text: 'Pode ajudar-me?', num: 38 },
  { text: 'Pode repetir?', num: 39 },
  { text: 'Mais devagar, por favor.', num: 40 },
  { text: 'Pode esperar?', num: 41 },
  { text: 'Um momento.', num: 42 },
  { text: 'Já vou.', num: 43 },
  { text: 'Já volto.', num: 44 },
  { text: 'Não é preciso.', num: 45 },
  { text: 'Está tudo bem.', num: 46 },
  { text: 'Sem problema.', num: 47 },
  { text: 'Se faz favor.', num: 48 },
  { text: 'Pode ser agora?', num: 49 },
  { text: 'Quando puder.', num: 50 },
  { text: 'Obrigada pela ajuda.', num: 51 },
  { text: 'Lamento.', num: 52 },
  { text: 'Desculpe o atraso.', num: 53 },
  { text: 'Foi sem querer.', num: 54 },
  { text: 'Não foi nada.', num: 55 },
  // Cluster 3 (56-75)
  { text: 'Não percebi.', num: 56 },
  { text: 'Percebo.', num: 57 },
  { text: 'Não entendo.', num: 58 },
  { text: 'Agora percebo.', num: 59 },
  { text: 'Mais ou menos.', num: 60 },
  { text: 'Um pouco.', num: 61 },
  { text: 'Não muito.', num: 62 },
  { text: 'Tudo claro.', num: 63 },
  { text: 'Não está claro.', num: 64 },
  { text: 'Pode explicar?', num: 65 },
  { text: 'O que quer dizer?', num: 66 },
  { text: 'Como assim?', num: 67 },
  { text: 'Já entendi.', num: 68 },
  { text: 'Não tenho a certeza.', num: 69 },
  { text: 'Parece-me bem.', num: 70 },
  { text: 'Não parece.', num: 71 },
  { text: 'É diferente.', num: 72 },
  { text: 'Faz diferença.', num: 73 },
  { text: 'É igual.', num: 74 },
  { text: 'É parecido.', num: 75 },
  // Cluster 4 (76-100)
  { text: 'Agora não.', num: 76 },
  { text: 'Agora sim.', num: 77 },
  { text: 'Mais tarde.', num: 78 },
  { text: 'Hoje não.', num: 79 },
  { text: 'Amanhã.', num: 80 },
  { text: 'Depois.', num: 81 },
  { text: 'Antes.', num: 82 },
  { text: 'Já passou.', num: 83 },
  { text: 'Ainda não.', num: 84 },
  { text: 'Já está.', num: 85 },
  { text: 'Ainda há tempo.', num: 86 },
  { text: 'Estou a chegar.', num: 87 },
  { text: 'Estou a ir.', num: 88 },
  { text: 'Estou aqui.', num: 89 },
  { text: 'Já cheguei.', num: 90 },
  { text: 'Fico aqui.', num: 91 },
  { text: 'Vamos embora.', num: 92 },
  { text: 'Volto já.', num: 93 },
  { text: 'Sem pressa.', num: 94 },
  { text: 'Com calma.', num: 95 },
  { text: 'Muito cedo.', num: 96 },
  { text: 'Muito tarde.', num: 97 },
  { text: 'A tempo.', num: 98 },
  { text: 'Fora de horas.', num: 99 },
  { text: 'Está perto.', num: 100 },
];

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateSQL() {
  console.log('-- Update audio_url for all phrases');
  console.log('-- Generated automatically\n');
  
  phrases.forEach(({ text, num }) => {
    const filename = `phrase-${num}-${sanitizeFilename(text)}.mp3`;
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
    
    // Escape single quotes in SQL
    const escapedText = text.replace(/'/g, "''");
    
    console.log(`UPDATE phrases`);
    console.log(`SET audio_url = '${audioUrl}'`);
    console.log(`WHERE portuguese_text = '${escapedText}';`);
    console.log('');
  });
}

generateSQL();







