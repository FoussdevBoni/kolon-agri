const fcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant FCFA entier, affiché avec séparateurs (« 12 500 FCFA »). */
export function formatFcfa(amount: number): string {
  return `${fcfa.format(amount)} FCFA`;
}
