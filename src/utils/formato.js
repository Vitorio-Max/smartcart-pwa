const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export const formatEuro = (n) => eur.format(Number(n) || 0);