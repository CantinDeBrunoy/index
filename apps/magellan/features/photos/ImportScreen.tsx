import { KraftLabel, WoodPage } from '@/features/detail/WoodKit';

/**
 * Import des photos — variante mobile. L'import lit un dossier du PC (iCloud pour
 * Windows) : il se fait depuis la version web, dans Edge ou Chrome.
 */
export function ImportScreen() {
  return (
    <WoodPage>
      <KraftLabel
        eyebrow="Photos"
        title="Importer mes photos"
        subtitle="L’import se fait depuis la version web de Magellan, sur ton PC (Edge ou Chrome)."
      />
    </WoodPage>
  );
}
