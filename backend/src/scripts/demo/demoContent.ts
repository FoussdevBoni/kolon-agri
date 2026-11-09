import type { SectionType } from '../../modules/pages/pageSections.js';

/**
 * Contenus de la démonstration commerciale : alimentés par `seed:demo`, puis modifiables depuis
 * le dashboard. Les prix sont fictifs ; les produits se repèrent par leurs références `DEMO-`.
 */
export const demoAssets = {
  terrain: 'Un conseiller agricole échange avec un groupe de productrices dans une parcelle',
  maraichage: 'Parcelles maraîchères cultivées à Bouaké, en Côte d’Ivoire',
  recolte: 'Producteurs transportant des tiges de maïs récoltées le long d’un champ',
  'champ-mais': 'Productrice dans un champ de maïs arrivé à maturité',
  semences: 'Bassines de grains et de semences',
  engrais: 'Granulés d’engrais',
  pulverisation: 'Un producteur traite sa parcelle avec un pulvérisateur à dos',
  tracteur: 'Tracteur équipé d’une charrue à disques préparant une parcelle',
  'mais-grains': 'Épis de maïs jaune mis à sécher',
  sorgho: 'Productrices désherbant une parcelle de sorgho',
  mil: 'Champ de mil en croissance à la saison des pluies',
  niebe: 'Graines de niébé rouge',
  dap: 'Granulés d’engrais phosphaté',
  uree: 'Granulés d’engrais présentés sur fond sombre',
  motopompe: 'Groupe motopompe d’irrigation en bordure de champ',
  motoculteur: 'Motoculteur stationné sous un hangar agricole',
  tomates: 'Producteurs triant une récolte de tomates au champ',
  marche: 'Vendeuses de produits vivriers sur un marché',
  conseil: 'Une conseillère échange avec des productrices assises',
} as const;
export type DemoAssetKey = keyof typeof demoAssets;

export interface DemoSection {
  type: SectionType;
  /** Identifiant de la section : son titre ; une section de même type et titre n'est pas recréée. */
  data: Record<string, unknown>;
  imageKey?: DemoAssetKey;
}

export interface DemoPage {
  key: string;
  /** Champs du bandeau à renseigner uniquement s'ils sont vides. */
  hero?: { subtitle?: string; imageKey?: DemoAssetKey };
  seo?: { title: string; description: string };
  sections: DemoSection[];
}

const cta = (title: string, text: string, label: string, href: string): DemoSection => ({
  type: 'callToAction',
  data: { title, text, link: { label, href } },
});

export const demoPages: DemoPage[] = [
  {
    key: 'home',
    hero: { imageKey: 'terrain' },
    sections: [
      {
        type: 'cards',
        data: {
          title: 'Nos engagements',
          intro: '',
          items: [
            { title: 'Produits adaptés', description: 'Semences, intrants et équipements' },
            { title: 'Suivi de proximité', description: 'Un appui au plus près du terrain' },
            {
              title: 'Réseau de partenaires',
              description: 'Le bon interlocuteur pour votre besoin',
            },
            { title: 'Devis sans engagement', description: 'Aucun paiement en ligne' },
          ],
        },
      },
      {
        type: 'richText',
        data: {
          title: 'Des intrants et équipements adaptés à vos cultures',
          paragraphs: ['Composez votre sélection et recevez une proposition de notre équipe.'],
        },
      },
      {
        type: 'imageText',
        imageKey: 'maraichage',
        data: {
          title: 'Un appui concret à chaque étape de votre projet',
          paragraphs: [
            'De l’idée à l’expansion de votre projet',
            'Études, financement, intrants et formation',
            'Un suivi de proximité à chaque étape',
          ],
          imagePosition: 'left',
          link: { label: 'Demander un accompagnement', href: '/accompagnement' },
        },
      },
      {
        type: 'imageText',
        imageKey: 'champ-mais',
        data: {
          title: 'Le bon partenaire pour votre besoin',
          paragraphs: [
            'Acheteurs, fournisseurs, transport, financement ou formation : décrivez votre besoin, nous identifions le partenaire adapté dans notre réseau.',
          ],
          imagePosition: 'right',
          link: { label: 'Trouver un partenaire', href: '/mise-en-relation' },
        },
      },
      cta(
        'Préparons ensemble votre prochaine campagne',
        'Envoyez votre demande : notre équipe vous recontacte avec une proposition adaptée.',
        'Demander un devis',
        '/demande-de-devis',
      ),
    ],
  },
  {
    key: 'about',
    hero: {
      subtitle: 'Aux côtés des producteurs et des porteurs de projets agricoles du Mali.',
      imageKey: 'tomates',
    },
    seo: {
      title: 'À propos de Kolon Agri',
      description:
        'Kolon Agri réunit intrants, équipements, accompagnement de projet et mise en relation agricole.',
    },
    sections: [
      {
        type: 'richText',
        data: {
          title: 'Qui sommes-nous ?',
          paragraphs: [
            'Kolon Agri réunit en un seul interlocuteur les intrants, les équipements, l’accompagnement de projet et la mise en relation.',
            'Notre objectif est simple : aider chaque producteur à décider et à investir avec des informations claires.',
          ],
        },
      },
      {
        type: 'cards',
        data: {
          title: 'Ce qui nous guide',
          intro: '',
          items: [
            {
              title: 'Notre mission',
              description:
                'Rendre les solutions agricoles plus accessibles et mieux adaptées aux réalités du terrain.',
            },
            {
              title: 'Notre vision',
              description:
                'Une agriculture malienne plus productive, plus rentable et plus durable, portée par des producteurs bien accompagnés.',
            },
          ],
        },
      },
      {
        type: 'cards',
        data: {
          title: 'Nos activités',
          intro: '',
          items: [
            {
              title: 'Fourniture d’intrants',
              description: 'Semences, engrais et produits de protection des cultures.',
              href: '/catalogue',
            },
            {
              title: 'Équipements agricoles',
              description: 'Matériel d’irrigation, de culture, de traitement et de stockage.',
              href: '/catalogue',
            },
            {
              title: 'Accompagnement de projet',
              description: 'Un appui pour préparer, lancer ou développer votre activité.',
              href: '/accompagnement',
            },
            {
              title: 'Mise en relation',
              description: 'Un accès au partenaire adapté à votre besoin.',
              href: '/mise-en-relation',
            },
          ],
        },
      },
      {
        type: 'imageText',
        imageKey: 'conseil',
        data: {
          title: 'Notre approche',
          paragraphs: [
            'Nous commençons par écouter : votre culture, votre parcelle, vos moyens et vos objectifs.',
            'Nous proposons ensuite une solution adaptée, sans vous orienter vers plus que nécessaire.',
            'Enfin, nous restons disponibles pour suivre sa mise en œuvre.',
          ],
          imagePosition: 'right',
          link: { label: 'Découvrir nos services', href: '/services' },
        },
      },
      cta(
        'Parlons de votre activité',
        'Décrivez-nous votre besoin : nous vous orientons vers la solution la plus adaptée.',
        'Nous contacter',
        '/contact',
      ),
    ],
  },
  {
    key: 'services',
    hero: {
      subtitle:
        'Des intrants au conseil, des solutions complémentaires pour faire avancer votre exploitation.',
      imageKey: 'recolte',
    },
    seo: {
      title: 'Services agricoles',
      description:
        'Fourniture d’intrants, équipements agricoles, accompagnement de projet et mise en relation.',
    },
    sections: [
      cta(
        'Vous ne savez pas par où commencer ?',
        'Présentez-nous votre projet : nous vous indiquons le service le plus adapté.',
        'Demander un accompagnement',
        '/accompagnement',
      ),
    ],
  },
  {
    key: 'catalog',
    hero: { imageKey: 'semences' },
    seo: {
      title: 'Catalogue agricole',
      description: 'Semences, engrais, protection des cultures et équipements agricoles.',
    },
    sections: [
      {
        type: 'richText',
        data: {
          title: 'Catalogue de démonstration',
          paragraphs: [
            'Les produits et les prix présentés sont fictifs et donnés à titre indicatif.',
          ],
        },
      },
      {
        type: 'faq',
        data: {
          title: 'Questions fréquentes',
          items: [
            {
              question: 'Les prix affichés sont-ils définitifs ?',
              answer:
                'Non. Dans cette démonstration, les prix sont fictifs et donnés à titre indicatif. Une proposition personnalisée vous est adressée après votre demande de devis.',
            },
            {
              question: 'Puis-je demander plusieurs produits à la fois ?',
              answer:
                'Oui. Ajoutez les produits et les variantes souhaités à votre sélection, puis envoyez une seule demande de devis.',
            },
            {
              question: 'Y a-t-il un paiement en ligne ?',
              answer:
                'Non. La demande de devis est sans engagement et aucun paiement n’est demandé.',
            },
          ],
        },
      },
    ],
  },
  {
    key: 'quotation-request',
    sections: [
      {
        type: 'faq',
        data: {
          title: 'Comment se passe votre demande ?',
          items: [
            {
              question: 'Que se passe-t-il après l’envoi ?',
              answer:
                'Vous recevez une référence à l’écran. Notre équipe étudie votre sélection et vous recontacte au numéro indiqué.',
            },
            {
              question: 'Suis-je engagé en envoyant cette demande ?',
              answer: 'Non. La demande de devis est sans engagement et sans paiement en ligne.',
            },
          ],
        },
      },
    ],
  },
  {
    key: 'accompaniment',
    hero: { imageKey: 'sorgho' },
    seo: {
      title: 'Accompagnement de projet agricole',
      description:
        'Producteurs, coopératives et porteurs de projet : présentez votre projet agricole à Kolon Agri.',
    },
    sections: [
      {
        type: 'cards',
        data: {
          title: 'Pour qui ?',
          intro: 'Un accompagnement pensé pour celles et ceux qui font vivre l’agriculture.',
          items: [
            {
              title: 'Producteurs individuels',
              description: 'Pour améliorer ou diversifier votre exploitation.',
            },
            {
              title: 'Coopératives',
              description: 'Pour structurer un projet porté à plusieurs.',
            },
            {
              title: 'Porteurs de projet',
              description: 'Pour transformer une idée en activité agricole.',
            },
          ],
        },
      },
      {
        type: 'cards',
        data: {
          title: 'Comment ça marche',
          intro: '',
          items: [
            {
              title: 'Vous décrivez votre projet',
              description: 'Type d’activité, avancement et besoins, via le formulaire ci-dessous.',
            },
            {
              title: 'Nous étudions votre demande',
              description: 'Notre équipe examine votre projet et ses priorités.',
            },
            {
              title: 'Nous échangeons avec vous',
              description: 'Un échange pour préciser vos objectifs et vos contraintes.',
            },
            {
              title: 'Nous définissons l’accompagnement',
              description: 'Études, financement, intrants ou formation, selon votre besoin.',
            },
          ],
        },
      },
      {
        type: 'faq',
        data: {
          title: 'Questions fréquentes',
          items: [
            {
              question: 'Quels types de projets sont concernés ?',
              answer: 'Les cultures, le maraîchage, l’élevage et la transformation agricole.',
            },
            {
              question: 'Dois-je déjà avoir commencé mon activité ?',
              answer:
                'Non. Vous pouvez nous solliciter dès le stade de l’idée, comme pour développer une activité existante.',
            },
          ],
        },
      },
    ],
  },
  {
    key: 'matching',
    hero: { imageKey: 'marche' },
    seo: {
      title: 'Mise en relation agricole',
      description: 'Acheteurs, fournisseurs, transport, financement : trouvez le bon partenaire.',
    },
    sections: [
      {
        type: 'cards',
        data: {
          title: 'Comment ça marche',
          intro: '',
          items: [
            {
              title: 'Décrivez votre besoin',
              description: 'Indiquez le type de partenaire recherché et votre échéance.',
            },
            {
              title: 'Nous recherchons dans notre réseau',
              description: 'Votre demande est étudiée par notre équipe.',
            },
            {
              title: 'Nous identifions un partenaire',
              description: 'Nous sélectionnons l’interlocuteur le plus adapté.',
            },
            {
              title: 'Nous vous mettons en contact',
              description: 'La relation peut alors démarrer dans de bonnes conditions.',
            },
          ],
        },
      },
      {
        type: 'cards',
        data: {
          title: 'Quels partenaires pouvez-vous rechercher ?',
          intro: 'Notre annuaire reste privé : vos échanges passent d’abord par notre équipe.',
          items: [
            { title: 'Fournisseurs d’intrants', description: '' },
            { title: 'Fournisseurs d’équipements', description: '' },
            { title: 'Acheteurs et débouchés', description: '' },
            { title: 'Prestataires de services', description: '' },
            { title: 'Transport et logistique', description: '' },
            { title: 'Financement', description: '' },
            { title: 'Formation et conseil', description: '' },
          ],
        },
      },
    ],
  },
  {
    key: 'contact',
    hero: {
      subtitle: 'Une question sur nos produits ou nos services ? Écrivez-nous.',
      imageKey: 'recolte',
    },
    seo: {
      title: 'Contact',
      description: 'Contactez l’équipe Kolon Agri grâce au formulaire en ligne.',
    },
    sections: [
      {
        type: 'faq',
        data: {
          title: 'Avant de nous écrire',
          items: [
            {
              question: 'Comment obtenir un devis ?',
              answer:
                'Sélectionnez vos produits dans le catalogue, puis envoyez votre demande de devis.',
            },
            {
              question: 'Comment présenter un projet agricole ?',
              answer: 'Utilisez le formulaire de la page Accompagnement.',
            },
          ],
        },
      },
    ],
  },
];

export const demoServices = [
  {
    slug: 'fourniture-intrants',
    title: 'Fourniture d’intrants',
    imageKey: 'semences',
    summary: 'Semences, engrais et produits de protection pour vos cultures.',
    paragraphs: [
      'Nous vous aidons à composer une sélection cohérente avec votre culture et votre campagne.',
      'Avantage : un seul devis pour l’ensemble de vos besoins.',
    ],
  },
  {
    slug: 'equipements-agricoles',
    title: 'Équipements agricoles',
    imageKey: 'tracteur',
    summary: 'Matériel d’irrigation, de culture, de traitement et de stockage.',
    paragraphs: [
      'Pompe, motoculteur, pulvérisateur ou stockage : l’équipement se choisit selon la taille de votre exploitation.',
      'Avantage : un matériel dimensionné selon votre activité.',
    ],
  },
  {
    slug: 'accompagnement-projet',
    title: 'Accompagnement de projet',
    imageKey: 'maraichage',
    summary: 'De l’idée à l’expansion : études, financement, intrants et formation.',
    paragraphs: [
      'Présentez votre projet : nous identifions avec vous les étapes prioritaires.',
      'Avantage : un projet mieux préparé et un interlocuteur de proximité.',
    ],
  },
  {
    slug: 'mise-en-relation',
    title: 'Mise en relation',
    imageKey: 'marche',
    summary: 'Acheteurs, fournisseurs, transport, financement et formation.',
    paragraphs: [
      'Décrivez votre besoin : nous recherchons le partenaire adapté dans notre réseau.',
      'Avantage : le bon interlocuteur, sans recherche dispersée.',
    ],
  },
] as const satisfies readonly {
  slug: string;
  title: string;
  imageKey: DemoAssetKey;
  summary: string;
  paragraphs: readonly string[];
}[];

export const demoCategories = [
  {
    slug: 'semences',
    name: 'Semences',
    imageKey: 'semences',
    description: 'Céréales, légumineuses et cultures maraîchères.',
  },
  {
    slug: 'engrais-amendements',
    name: 'Engrais et amendements',
    imageKey: 'engrais',
    description: 'Nourrir le sol et les cultures à chaque étape.',
  },
  {
    slug: 'protection-cultures',
    name: 'Protection des cultures',
    imageKey: 'pulverisation',
    description: 'Matériel de traitement et solutions naturelles.',
  },
  {
    slug: 'equipements',
    name: 'Équipements',
    imageKey: 'tracteur',
    description: 'Irrigation, travail du sol et stockage.',
  },
] as const satisfies readonly {
  slug: string;
  name: string;
  imageKey: DemoAssetKey;
  description: string;
}[];

export type DemoCategorySlug = (typeof demoCategories)[number]['slug'];

export const DEMO_PRICE_NOTICE =
  'Prix indicatifs fictifs, affichés uniquement pour cette démonstration.';

interface DemoVariant {
  label: string;
  code: string;
  unit: string;
  price: number | null;
}

interface DemoProduct {
  slug: string;
  name: string;
  category: DemoCategorySlug;
  imageKey: DemoAssetKey;
  featured?: boolean;
  shortDescription: string;
  description: string;
  characteristics: [string, string][];
  variants: DemoVariant[];
}

const sac = (kg: number, code: string, price: number | null): DemoVariant => ({
  label: `Sac de ${String(kg)} kg`,
  code,
  unit: 'sac',
  price,
});
const unite = (code: string, price: number | null): DemoVariant => ({
  label: 'Standard',
  code,
  unit: 'unité',
  price,
});

export const demoProducts: DemoProduct[] = [
  {
    slug: 'semence-mais-sotubaka',
    name: 'Semence de maïs Sotubaka',
    category: 'semences',
    imageKey: 'mais-grains',
    featured: true,
    shortDescription: 'Variété de maïs pour les campagnes d’hivernage.',
    description: 'Semence de maïs destinée aux producteurs de céréales.',
    characteristics: [
      ['Culture', 'Maïs'],
      ['Variété', 'Sotubaka'],
      ['Saison', 'Hivernage'],
    ],
    variants: [sac(5, 'MAIS-5', 7500), sac(25, 'MAIS-25', 32500)],
  },
  {
    slug: 'semence-sorgho-soumba',
    name: 'Semence de sorgho Soumba',
    category: 'semences',
    imageKey: 'sorgho',
    shortDescription: 'Sorgho pour les exploitations céréalières.',
    description: 'Semence de sorgho pour les cultures pluviales.',
    characteristics: [
      ['Culture', 'Sorgho'],
      ['Variété', 'Soumba'],
      ['Saison', 'Hivernage'],
    ],
    variants: [sac(5, 'SORGHO-5', 5000), sac(25, 'SORGHO-25', 22500)],
  },
  {
    slug: 'semence-mil-toroniou',
    name: 'Semence de mil Toroniou',
    category: 'semences',
    imageKey: 'mil',
    shortDescription: 'Mil pour les cultures pluviales.',
    description: 'Semence de mil adaptée aux systèmes céréaliers pluviaux.',
    characteristics: [
      ['Culture', 'Mil'],
      ['Variété', 'Toroniou'],
      ['Saison', 'Hivernage'],
    ],
    variants: [sac(5, 'MIL-5', 4500), sac(25, 'MIL-25', 20000)],
  },
  {
    slug: 'semence-niebe-korobalen',
    name: 'Semence de niébé Korobalen',
    category: 'semences',
    imageKey: 'niebe',
    shortDescription: 'Légumineuse pour diversifier vos cultures.',
    description: 'Semence de niébé, utile en association ou en rotation avec les céréales.',
    characteristics: [
      ['Culture', 'Niébé'],
      ['Variété', 'Korobalen'],
      ['Type', 'Légumineuse'],
    ],
    variants: [
      { label: 'Sachet de 1 kg', code: 'NIEBE-1', unit: 'sachet', price: 2500 },
      { label: 'Sac de 5 kg', code: 'NIEBE-5', unit: 'sac', price: 11000 },
    ],
  },
  {
    slug: 'semence-oignon-violet-galmi',
    name: 'Semence d’oignon Violet de Galmi',
    category: 'semences',
    imageKey: 'maraichage',
    featured: true,
    shortDescription: 'Variété d’oignon pour le maraîchage.',
    description: 'Semence d’oignon destinée aux cultures maraîchères.',
    characteristics: [
      ['Culture', 'Oignon'],
      ['Variété', 'Violet de Galmi'],
      ['Type', 'Maraîchage'],
    ],
    variants: [
      { label: 'Sachet de 100 g', code: 'OIGNON-100', unit: 'sachet', price: 6000 },
      { label: 'Sachet de 500 g', code: 'OIGNON-500', unit: 'sachet', price: null },
    ],
  },
  {
    slug: 'engrais-npk-15-15-15',
    name: 'Engrais NPK 15-15-15',
    category: 'engrais-amendements',
    imageKey: 'engrais',
    featured: true,
    shortDescription: 'Engrais complet à teneur équilibrée.',
    description: 'Engrais minéral apportant azote, phosphore et potassium en proportions égales.',
    characteristics: [
      ['Azote (N)', '15 %'],
      ['Phosphore (P₂O₅)', '15 %'],
      ['Potassium (K₂O)', '15 %'],
    ],
    variants: [sac(50, 'NPK-50', 24000)],
  },
  {
    slug: 'engrais-uree-46',
    name: 'Urée 46 %',
    category: 'engrais-amendements',
    imageKey: 'uree',
    shortDescription: 'Engrais azoté concentré.',
    description: 'Engrais azoté à forte teneur, utilisé en apport de couverture.',
    characteristics: [
      ['Azote (N)', '46 %'],
      ['Forme', 'Granulés'],
    ],
    variants: [sac(50, 'UREE-50', 22000)],
  },
  {
    slug: 'engrais-dap-18-46-0',
    name: 'DAP 18-46-0',
    category: 'engrais-amendements',
    imageKey: 'dap',
    shortDescription: 'Engrais riche en phosphore.',
    description: 'Phosphate diammonique, source d’azote et de phosphore.',
    characteristics: [
      ['Azote (N)', '18 %'],
      ['Phosphore (P₂O₅)', '46 %'],
      ['Forme', 'Granulés'],
    ],
    variants: [sac(50, 'DAP-50', 27000)],
  },
  {
    slug: 'compost-organique',
    name: 'Compost organique',
    category: 'engrais-amendements',
    imageKey: 'maraichage',
    shortDescription: 'Amendement pour enrichir le sol.',
    description: 'Amendement organique destiné à améliorer la structure des sols.',
    characteristics: [
      ['Type', 'Amendement organique'],
      ['Usage', 'Maraîchage et grandes cultures'],
    ],
    variants: [sac(25, 'COMPOST-25', 4500), sac(50, 'COMPOST-50', 8000)],
  },
  {
    slug: 'pulverisateur-dos-16-l',
    name: 'Pulvérisateur à dos 16 L',
    category: 'protection-cultures',
    imageKey: 'pulverisation',
    featured: true,
    shortDescription: 'Pulvérisateur manuel pour petites et moyennes parcelles.',
    description: 'Pulvérisateur à dos à pression manuelle.',
    characteristics: [
      ['Capacité', '16 litres'],
      ['Fonctionnement', 'Manuel'],
    ],
    variants: [unite('PULV-16', 18500)],
  },
  {
    slug: 'huile-de-neem',
    name: 'Huile de neem',
    category: 'protection-cultures',
    imageKey: 'pulverisation',
    shortDescription: 'Solution d’origine végétale.',
    description: 'Huile végétale extraite des graines de neem.',
    characteristics: [
      ['Origine', 'Végétale'],
      ['Matière', 'Graines de neem'],
    ],
    variants: [
      { label: 'Bidon de 1 L', code: 'NEEM-1', unit: 'bidon', price: 6500 },
      { label: 'Bidon de 5 L', code: 'NEEM-5', unit: 'bidon', price: null },
    ],
  },
  {
    slug: 'kit-protection-individuelle',
    name: 'Kit de protection individuelle',
    category: 'protection-cultures',
    imageKey: 'pulverisation',
    shortDescription: 'Pour travailler en sécurité lors des traitements.',
    description: 'Ensemble d’équipements de protection pour les opérations de traitement.',
    characteristics: [
      ['Usage', 'Traitement des cultures'],
      ['Composition', 'Gants, masque, lunettes'],
    ],
    variants: [unite('EPI-KIT', 12000)],
  },
  {
    slug: 'motopompe-essence',
    name: 'Motopompe essence',
    category: 'equipements',
    imageKey: 'motopompe',
    featured: true,
    shortDescription: 'Pompage de l’eau pour l’irrigation.',
    description: 'Motopompe à essence pour l’irrigation des parcelles.',
    characteristics: [
      ['Énergie', 'Essence'],
      ['Usage', 'Irrigation'],
    ],
    variants: [unite('MOTOPOMPE', null)],
  },
  {
    slug: 'kit-goutte-a-goutte-500',
    name: 'Kit goutte-à-goutte 500 m²',
    category: 'equipements',
    imageKey: 'maraichage',
    shortDescription: 'Irrigation localisée pour le maraîchage.',
    description: 'Kit d’irrigation localisée pour une parcelle maraîchère.',
    characteristics: [
      ['Surface couverte', '500 m²'],
      ['Usage', 'Maraîchage'],
    ],
    variants: [unite('GAG-500', 95000)],
  },
  {
    slug: 'motoculteur',
    name: 'Motoculteur',
    category: 'equipements',
    imageKey: 'motoculteur',
    shortDescription: 'Pour le travail du sol motorisé.',
    description: 'Motoculteur pour la préparation des parcelles.',
    characteristics: [
      ['Usage', 'Travail du sol'],
      ['Type', 'Motorisé'],
    ],
    variants: [unite('MOTOCULT', null)],
  },
  {
    slug: 'sacs-stockage-hermetiques-100-kg',
    name: 'Sacs de stockage hermétiques 100 kg',
    category: 'equipements',
    imageKey: 'semences',
    featured: true,
    shortDescription: 'Pour mieux conserver vos récoltes.',
    description: 'Sacs hermétiques pour la conservation des grains après récolte.',
    characteristics: [
      ['Capacité', '100 kg'],
      ['Usage', 'Conservation des grains'],
    ],
    variants: [{ label: 'Lot de 10', code: 'SACS-10', unit: 'lot', price: 15000 }],
  },
];
