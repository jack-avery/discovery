import { Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/app/layouts'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { SubmitResourcePage } from '@/pages/SubmitResourcePage'
import { RequestResourceUpdatePage } from '@/pages/RequestResourceUpdatePage'
import { StaffSignInPage } from '@/pages/StaffSignInPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'submit', element: <SubmitResourcePage /> },
      { path: 'request-update', element: <RequestResourceUpdatePage /> },
      { path: 'sign-in', element: <StaffSignInPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]
