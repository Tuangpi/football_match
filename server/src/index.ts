import app from './app';
import { PrismaClient } from '@prisma/client';

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export { server };