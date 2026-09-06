import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';

import { RafflesScreen } from './routes/RafflesScreen';
import { BoardTab } from './routes/board/BoardTab';
import { CustomersTab } from './routes/board/CustomersTab';
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
