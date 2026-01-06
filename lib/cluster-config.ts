// Cluster configuration with colors and icons
export const clusterConfig: Record<string, { 
  color: string; // Hex color for background
  icon: string; 
  isLarge?: boolean;
}> = {
  'All Clusters': {
    color: '#94B7F2',
    icon: '👾',
  },
  'My take': {
    color: '#FBDDC3',
    icon: '💬',
  },
  'Politeness and Requests': {
    color: '#FAF7BF',
    icon: '👌',
  },
  'Making sense': {
    color: '#FBC3C8',
    icon: '🙃',
  },
  'Time and Path': {
    color: '#84E9F3',
    icon: '⏳',
  },
  'Home and Daily Life': {
    color: '#E9B0E4',
    icon: '🏠',
  },
  'Children and School': {
    color: '#90F5D9',
    icon: '👶',
  },
  'Shops and Services': {
    color: '#B2FDB0',
    icon: '🛒',
  },
  'Cafes and Restaurants': {
    color: '#91B7FF',
    icon: '☕',
  },
  'Emotions and States': {
    color: '#84D4F2',
    icon: '🤡',
  },
  'Speech Connectors': {
    color: '#FA9A9D',
    icon: '💭',
  },
  'Conflict and Discontent': {
    color: '#ADA0FF',
    icon: '🤬',
  },
  'Cult Phrases': {
    color: '#B474FF',
    icon: '🎬',
    isLarge: true,
  },
};

// Helper function to get cluster color
export const getClusterColor = (clusterName: string): string => {
  const config = clusterConfig[clusterName];
  return config?.color || '#CCCCCC'; // Default gray if not found
};

