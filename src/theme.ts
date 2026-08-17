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

export const dark: Theme = {
  bg: '#0D0A2E',
  surface: '#19154A',
  surface2: '#231D63',
  text: '#F0EEFF',
  textMuted: '#9B91CC',
  border: 'rgba(123, 47, 190, 0.35)',
  borderSubtle: 'rgba(139, 130, 184, 0.15)',
  chartBar: 'rgba(168, 148, 220, 0.32)',
  inputBg: 'rgba(13, 10, 46, 0.6)',
  shadow: 'none',
  elliLabel: '#C084FC',
};

export const light: Theme = {
  bg: '#F4F2FF',
  surface: '#FFFFFF',
  surface2: '#EDE9FF',
  text: '#1A0F40',
  textMuted: '#7263A8',
  border: 'rgba(107, 95, 168, 0.2)',
  borderSubtle: 'rgba(107, 95, 168, 0.1)',
  chartBar: '#C9B8EC',
  inputBg: '#EDE9FF',
  shadow: '0 2px 16px rgba(107, 95, 168, 0.1)',
  elliLabel: '#7B2FBE',
};
