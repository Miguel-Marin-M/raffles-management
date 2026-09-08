import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';

import { HistoryScreen } from './routes/HistoryScreen';
import { RafflesScreen } from './routes/RafflesScreen';
import { BoardTab } from './routes/board/BoardTab';
import { CustomersTab } from './routes/board/CustomersTab';
import { parseCustomersSearch } from './routes/board/customers-search';
import { PosterTab } from './routes/board/PosterTab';
import { RaffleLayout } from './routes/board/RaffleLayout';
import { SummaryTab } from './routes/board/SummaryTab';
import { RootLayout } from './routes/root/RootLayout';

const rootRoute = createRootRoute({ component: RootLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/raffles' });
  },
});

const rafflesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/raffles',
  component: RafflesScreen,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/raffles/history',
  component: HistoryScreen,
});

const raffleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/raffles/$raffleId',
  component: RaffleLayout,
});

// Opening a raffle lands on its board.
const raffleIndexRoute = createRoute({
  getParentRoute: () => raffleRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/raffles/$raffleId/board', params });
  },
});

const boardRoute = createRoute({
  getParentRoute: () => raffleRoute,
  path: '/board',
  component: BoardTab,
});

const customersRoute = createRoute({
  getParentRoute: () => raffleRoute,
  path: '/customers',
  component: CustomersTab,
  // The filter and the page live in the URL, not in component state.
  validateSearch: parseCustomersSearch,
});

const posterRoute = createRoute({
  getParentRoute: () => raffleRoute,
  path: '/poster',
  component: PosterTab,
});

const summaryRoute = createRoute({
  getParentRoute: () => raffleRoute,
  path: '/summary',
  component: SummaryTab,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  rafflesRoute,
  historyRoute,
  raffleRoute.addChildren([
    raffleIndexRoute,
    boardRoute,
    customersRoute,
    posterRoute,
    summaryRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
