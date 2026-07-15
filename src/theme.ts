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
}

export const dark: Theme = {
  bg: '#0D0A2E',
  surface: '#1A1550',
  surface2: '#231D63',
  text: '#F0EEFF',
  textMuted: '#8B82B8',
  border: 'rgba(123, 47, 190, 0.35)',
  borderSubtle: 'rgba(139, 130, 184, 0.15)',
  chartBar: 'rgba(139, 130, 184, 0.25)',
  inputBg: 'rgba(13, 10, 46, 0.6)',
};

export const light: Theme = {
  bg: '#FFFFFF',
  surface: '#F5F2FF',
  surface2: '#EDE8FF',
  text: '#1A1040',
  textMuted: '#6B5FA8',
  border: 'rgba(123, 47, 190, 0.25)',
  borderSubtle: 'rgba(123, 47, 190, 0.12)',
  chartBar: 'rgba(100, 80, 180, 0.18)',
  inputBg: 'rgba(237, 232, 255, 0.6)',
};
