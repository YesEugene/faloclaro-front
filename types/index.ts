export interface Cluster {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

export interface Phrase {
  id: string;
  cluster_id: string;
  portuguese_text: string;
  ipa_transcription: string | null;
  audio_url: string | null;
  order_index: number;
  movie_title: string | null;
  movie_character: string | null;
  movie_year: number | null;
  phrase_type?: 'word' | 'short_sentence' | 'long_sentence';
}

export interface Translation {
  id: string;
  phrase_id: string;
  language_code: string;
  translation_text: string;
}

export interface PhraseWithTranslation extends Phrase {
  translation?: string;
}

