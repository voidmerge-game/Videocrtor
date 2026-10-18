// Visual identity — "aged atlas" palette inspired by classic history documentaries
export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const C = {
  ocean: '#0b1d2e',
  oceanLight: '#163a57',
  land: '#b9a77d',
  landDark: '#8f7d57',
  landShade: '#6f6042',
  border: 'rgba(40,30,15,0.55)',
  graticule: 'rgba(255,255,255,0.06)',
  ink: '#1a1410',
  paper: '#efe6d2',
  gold: '#d6b36a',
  red: '#b3271e',
  white: '#f5f1e8',
  shadow: 'rgba(0,0,0,0.55)',
  // Colonial powers
  britain: '#c8323a',
  france: '#2f5fb3',
  germany: '#4a4a4a',
  belgium: '#d9a21b',
  portugal: '#2e8b57',
  italy: '#3aa65a',
  spain: '#e0872b',
  ottoman: '#7d3c98',
  independent: '#9a8c6a',
};

export type Power =
  | 'britain' | 'france' | 'germany' | 'belgium' | 'portugal'
  | 'italy' | 'spain' | 'ottoman' | 'independent';

export const POWER_NAME: Record<Power, string> = {
  britain: 'BRITAIN', france: 'FRANCE', germany: 'GERMANY', belgium: 'BELGIUM',
  portugal: 'PORTUGAL', italy: 'ITALY', spain: 'SPAIN', ottoman: 'OTTOMAN EMPIRE',
  independent: 'INDEPENDENT',
};

export const FONT = {
  title: 'Cinzel',
  label: 'Barlow Condensed',
  map: 'Montserrat',
  type: 'Special Elite',
  body: 'Barlow',
};
