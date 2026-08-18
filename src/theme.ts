export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  chartBar: string;
  inputBg: string;
  shadow: string;
  elliLabel: string;
}

export const light: Theme = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  surface2: '#F2F4F7',
  text: '#101828',
  textMuted: '#667085',
  border: '#E4E7EC',
  borderSubtle: '#F2F4F7',
  chartBar: '#D0D5DD',
  inputBg: '#F9FAFB',
  shadow: '0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)',
  elliLabel: '#6941C6',
};

export const dark: Theme = {
  bg: '#0D0A1E',
  surface: '#161427',
  surface2: '#1F1C35',
  text: '#F9FAFB',
  textMuted: '#94A3B8',
  border: 'rgba(155,139,244,0.2)',
  borderSubtle: 'rgba(155,139,244,0.08)',
  chartBar: 'rgba(148,163,184,0.22)',
  inputBg: '#0D0A1E',
  shadow: 'none',
  elliLabel: '#9B8BF4',
};
