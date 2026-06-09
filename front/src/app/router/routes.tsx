import { Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/app/layouts'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]
