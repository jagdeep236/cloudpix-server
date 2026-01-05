import { Router } from 'express';

import PATHS from '@src/common/constants/PATHS';
import UserRoutes from './UserRoutes';
import AuthRoutes from './AuthRoutes';
import FileRoutes from './FileRoutes';
import ShareRoutes from './ShareRoutes';
import HealthRoutes from './HealthRoutes';
import MetricsRoutes from './MetricsRoutes';

const apiRouter = Router();

// ** Health & Metrics Routes ** //
apiRouter.get('/health', HealthRoutes.health);
apiRouter.get('/metrics', MetricsRoutes.metrics);

// ** Auth Routes ** //
const authRouter = Router();
authRouter.post('/register', AuthRoutes.register);
authRouter.post('/login', AuthRoutes.login);
authRouter.get('/profile', ...AuthRoutes.getProfile);
apiRouter.use('/auth', authRouter);

// ** File Routes ** //
const fileRouter = Router();
fileRouter.post('/upload', ...FileRoutes.upload);
fileRouter.get('/', ...FileRoutes.getAll);
// File share creation and listing (requires auth) - register before /:id routes
fileRouter.post('/:id/share', ...ShareRoutes.create);
fileRouter.get('/:id/share-links', ...ShareRoutes.getByFileId);
// Generic file routes - must come after more specific routes
fileRouter.get('/:id', ...FileRoutes.getById);
fileRouter.put('/:id', ...FileRoutes.update);
fileRouter.delete('/:id', ...FileRoutes.delete);
apiRouter.use('/files', fileRouter);

// ** Share Routes ** //
const shareRouter = Router();
shareRouter.post('/:linkId/revoke', ...ShareRoutes.revoke);
shareRouter.get('/user', ...ShareRoutes.getUserShareLinks);
apiRouter.use('/share', shareRouter);

// Share link access (no auth required)
apiRouter.get('/share/:linkId', ShareRoutes.getByLinkId);

// ** User Routes (legacy - keeping for compatibility) ** //
const userRouter = Router();
userRouter.get(PATHS.Users.Get, UserRoutes.getAll);
userRouter.post(PATHS.Users.Add, UserRoutes.add);
userRouter.put(PATHS.Users.Update, UserRoutes.update);
userRouter.delete(PATHS.Users.Delete, UserRoutes.delete);
apiRouter.use(PATHS.Users._, userRouter);

export default apiRouter;
