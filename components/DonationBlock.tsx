'use client';

import { useState } from 'react';
import { useAppLanguage } from '@/lib/language-context';

interface DonationBlockProps {
  className?: string;
}

export default function DonationBlock({ className = '' }: DonationBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useAppLanguage();

  const translations = {
    en: {
      title: 'Support FaloClaro',
      description: 'Help me keep FaloClaro growing and improving.',
      amounts: ['€1', '€10', '€100'],
      customAmount: 'Custom amount',
      email: 'Email (optional)',
      comment: 'Comment (optional)',
      commentPlaceholder: 'I would be happy to receive any feedback or suggestions on how FaloClaro can be improved.',
      payButton: 'Pay',
      cancelButton: 'Cancel',
      processing: 'Processing...',
    },
    ru: {
      title: 'Поддержать FaloClaro',
      description: 'Помогите мне развивать и улучшать FaloClaro.',
      amounts: ['€1', '€10', '€100'],
      customAmount: 'Своя сумма',
      email: 'Email (необязательно)',
      comment: 'Комментарий (необязательно)',
      commentPlaceholder: 'Я буду рад любому вашему отзыву или предложениям, как FaloClaro можно сделать лучше.',
      payButton: 'Оплатить',
      cancelButton: 'Отмена',
      processing: 'Обработка...',
    },
    pt: {
      title: 'Apoiar FaloClaro',
      description: 'Ajude-me a manter o FaloClaro crescendo e melhorando.',
      amounts: ['€1', '€10', '€100'],
      customAmount: 'Valor personalizado',
      email: 'Email (opcional)',
      comment: 'Comentário (opcional)',
      commentPlaceholder: 'Ficaria feliz em receber qualquer feedback ou sugestões sobre como o FaloClaro pode ser melhorado.',
      payButton: 'Pagar',
      cancelButton: 'Cancelar',
      processing: 'Processando...',
    },
  };

  const t = translations[language] || translations.en;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine amount
    let amount = selectedAmount;
    if (!amount && customAmount) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      amount = parsed;
    }

    if (!amount) {
      alert('Please select or enter an amount');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          email: email.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}>
      <div
        className={`border-t-2 border-gray-200 shadow-lg transition-all duration-300 ${
          isExpanded ? 'bg-white max-h-[90vh] overflow-y-auto' : 'bg-[#1ABD15] h-[90px]'
        }`}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full px-4 flex items-center justify-between transition-colors ${
            isExpanded ? 'py-4 hover:bg-gray-50' : 'h-[90px]'
          }`}
        >
          <div className="flex flex-col items-start gap-1">
            <span
              className={`font-semibold ${
                isExpanded ? 'text-lg text-gray-900' : 'text-[23px] text-white'
              }`}
            >
              {t.title}
            </span>
            <span
              className={`${
                isExpanded ? 'text-sm text-gray-500 hidden sm:inline' : 'text-[14px] text-white'
              }`}
            >
              {t.description}
            </span>
          </div>
          <svg
            className={`w-5 h-5 transition-transform ${
              isExpanded ? 'text-gray-600 rotate-180' : 'text-white'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-6 pt-2 border-t border-gray-100">
            {/* Subtitle in expanded state */}
            <p className="text-sm text-gray-600 mb-4">
              {t.description}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select amount
                </label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[1, 10, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountSelect(amount)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedAmount === amount
                          ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      €{amount}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.customAmount}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.comment}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  {t.cancelButton}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!selectedAmount && !customAmount)}
                  className="flex-1 px-4 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? t.processing : t.payButton}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

