import { createBrowserRouter } from 'react-router-dom'
import { routes } from './routes'

/** Data router required for submission navigation blocking (`useBlocker`). */
export const browserRouter = createBrowserRouter(routes)
