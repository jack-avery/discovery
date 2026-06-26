import type { ResourceMapItem } from '@/types/resource-map'

/**
 * Mock map pins — structured to match future GET /api/v1/resources/map payloads.
 * Coordinates are approximate locations within the Rideau-Rockcliffe service area.
 */
export const mockMapItems: ResourceMapItem[] = [
  {
    id: 'res-rrcrc',
    slug: 'rideau-rockcliffe-community-resource-centre',
    name: 'Rideau-Rockcliffe Community Resource Centre',
    categorySlug: 'recreation',
    location: {
      latitude: 45.4445,
      longitude: -75.6392,
      address: '815 St. Laurent Blvd, Ottawa, ON K1K 3A7',
    },
  },
  {
    id: 'res-food-bank',
    slug: 'rideau-rockcliffe-food-bank',
    name: 'Rideau-Rockcliffe Food Bank',
    categorySlug: 'food-support',
    location: {
      latitude: 45.4468,
      longitude: -75.6351,
      address: '225 Donald St, Ottawa, ON',
    },
  },
  {
    id: 'res-youth-dropin',
    slug: 'rockcliffe-youth-drop-in',
    name: 'Rockcliffe Youth Drop-In',
    categorySlug: 'recreation',
    location: {
      latitude: 45.4482,
      longitude: -75.6425,
      address: '380 Springfield Rd, Ottawa, ON',
    },
  },
  {
    id: 'res-mental-health',
    slug: 'community-mental-health-support',
    name: 'Community Mental Health Support',
    categorySlug: 'mental-health',
    location: {
      latitude: 45.4412,
      longitude: -75.6318,
      address: '1025 St. Laurent Blvd, Ottawa, ON',
    },
  },
  {
    id: 'res-seniors-program',
    slug: 'seniors-wellness-program',
    name: 'Seniors Wellness Program',
    categorySlug: 'healthcare',
    location: {
      latitude: 45.4495,
      longitude: -75.637,
      address: '240 Marier Ave, Ottawa, ON',
    },
  },
  {
    id: 'res-employment',
    slug: 'employment-resource-hub',
    name: 'Employment Resource Hub',
    categorySlug: 'employment',
    location: {
      latitude: 45.4428,
      longitude: -75.6455,
      address: '1595 Bathurst Dr, Ottawa, ON',
    },
  },
  {
    id: 'res-housing',
    slug: 'housing-assistance-office',
    name: 'Housing Assistance Office',
    categorySlug: 'housing',
    location: {
      latitude: 45.4475,
      longitude: -75.6285,
      address: '885 Industrial Ave, Ottawa, ON',
    },
  },
  {
    id: 'res-newcomer',
    slug: 'newcomer-settlement-services',
    name: 'Newcomer Settlement Services',
    categorySlug: 'education',
    location: {
      latitude: 45.4435,
      longitude: -75.6335,
      address: '945 St. Laurent Blvd, Ottawa, ON',
    },
  },
]
