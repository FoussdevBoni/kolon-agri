import type { DefaultPageContent } from './pageService.js';

/**
 * Contenu éditorial initial, publié par `cms:seed` sur les pages jamais modifiées.
 * Aucun chiffre ni témoignage inventé : à compléter depuis le tableau de bord.
 */
export const defaultPageContents: readonly DefaultPageContent[] = [
  {
    key: 'home',
    seo: {
      title: 'Kolon Agri — Solutions agricoles au Mali',
      description:
        'Intrants, équipements, accompagnement de projets et mise en relation agricole au Mali.',
    },
    sections: [
      {
        type: 'hero',
        data: {
          eyebrow: 'Agriculture au Mali',
          title: 'Des solutions agricoles fiables, de l’intrant au projet.',
          subtitle:
            'Kolon Agri accompagne producteurs et porteurs de projets avec des produits adaptés, un suivi de proximité et un réseau de partenaires.',
          primaryLink: { label: 'Demander un devis', href: '/demande-de-devis' },
          secondaryLink: { label: 'Découvrir le catalogue', href: '/catalogue' },
        },
      },
      {
        type: 'cards',
        data: {
          title: 'Comment pouvons-nous vous aider ?',
          items: [
            {
              title: 'Catalogue',
              description:
                'Intrants, semences et équipements, avec demande de devis multi-produits.',
              href: '/catalogue',
            },
            {
              title: 'Accompagnement',
              description: 'Un appui pour préparer, lancer ou développer votre projet agricole.',
              href: '/accompagnement',
            },
            {
              title: 'Mise en relation',
              description: 'Nous identifions le partenaire adapté à votre besoin.',
              href: '/mise-en-relation',
            },
          ],
        },
      },
      { type: 'featuredProducts', data: { title: 'Produits mis en avant', limit: 6 } },
    ],
  },
  {
    key: 'about',
    sections: [{ type: 'hero', data: { eyebrow: 'À propos', title: 'Kolon Agri' } }],
  },
  {
    key: 'services',
    sections: [
      { type: 'hero', data: { eyebrow: 'Services', title: 'Nos services' } },
      { type: 'servicesList', data: {} },
    ],
  },
  {
    key: 'catalog',
    sections: [
      {
        type: 'hero',
        data: {
          eyebrow: 'Catalogue',
          title: 'Produits et équipements',
          subtitle: 'Sélectionnez vos produits et variantes, puis envoyez une demande de devis.',
        },
      },
    ],
  },
  {
    key: 'quotation-request',
    sections: [
      {
        type: 'hero',
        data: {
          eyebrow: 'Devis',
          title: 'Demande de devis',
          subtitle:
            'Indiquez vos coordonnées et les produits souhaités : nous revenons vers vous avec une proposition.',
        },
      },
    ],
  },
  {
    key: 'accompaniment',
    sections: [
      {
        type: 'hero',
        data: {
          eyebrow: 'Accompagnement',
          title: 'Accompagnement de projet agricole',
          subtitle: 'De l’idée à l’expansion, présentez votre projet et vos besoins.',
        },
      },
    ],
  },
  {
    key: 'matching',
    sections: [
      {
        type: 'hero',
        data: {
          eyebrow: 'Mise en relation',
          title: 'Trouver le bon partenaire',
          subtitle:
            'Décrivez votre besoin : nous identifions un partenaire adapté au sein de notre réseau.',
        },
      },
    ],
  },
  {
    key: 'contact',
    sections: [{ type: 'hero', data: { eyebrow: 'Contact', title: 'Nous contacter' } }],
  },
  {
    key: 'site',
    sections: [
      {
        type: 'siteIdentity',
        data: {
          name: 'Kolon Agri',
          tagline:
            'Intrants, équipements, accompagnement de projets et mise en relation agricole au Mali.',
        },
      },
    ],
  },
];
