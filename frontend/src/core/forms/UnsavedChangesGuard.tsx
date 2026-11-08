import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';

function isSavedNavigation(state: unknown): boolean {
  return (
    typeof state === 'object' && state !== null && 'afterSave' in state && state.afterSave === true
  );
}

/** Garde active : n'existe que lorsque le formulaire contient des modifications. */
function ActiveGuard() {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && !isSavedNavigation(nextLocation.state),
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Modifications non enregistrées"
      description="Vos modifications seront perdues si vous quittez cette page."
      confirmLabel="Quitter sans enregistrer"
      cancelLabel="Rester sur la page"
      tone="danger"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}

/**
 * Protège un formulaire non enregistré : confirmation avant toute navigation interne
 * et avertissement du navigateur à la fermeture ou au rechargement de l'onglet.
 * Le bloqueur n'est enregistré que pendant l'édition (un seul bloqueur actif par routeur).
 * Une navigation déclenchée juste après un enregistrement passe `state: { afterSave: true }`.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  return when ? <ActiveGuard /> : null;
}
