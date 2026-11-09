/** Photographies libres de droits de la vitrine (fichiers redimensionnés dans /images/home). */
export interface HomePhoto {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
}

const base = '/images/home';

export const homePhotos = {
  hero: {
    src: `${base}/accompagnement-terrain-1280.jpg`,
    srcSet: `${base}/accompagnement-terrain-960.jpg 960w, ${base}/accompagnement-terrain-1280.jpg 1280w`,
    width: 1280,
    height: 850,
    alt: 'Un conseiller agricole échange avec un groupe de productrices au milieu d’une parcelle',
    title: 'Training women farmers on climate smart innovations in Nyando, Kenya',
    author: 'Climate Change, Agriculture and Food Security',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/deed.fr',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Training_women_farmers_on_climate_smart_innovations_in_Nyando,_Kenya_(9417196732).jpg',
  },
  final: {
    src: `${base}/recolte-mais-1280.jpg`,
    srcSet: `${base}/recolte-mais-960.jpg 960w, ${base}/recolte-mais-1280.jpg 1280w`,
    width: 1280,
    height: 853,
    alt: 'Producteurs transportant des tiges de maïs récoltées le long d’un champ',
    title: 'Farmers in Tula',
    author: 'BarryTheOctopus',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Farmers_in_Tula.jpg',
  },
} as const satisfies Record<string, HomePhoto>;
