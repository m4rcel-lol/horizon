import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === "production" ? ["error", "warn", "log"] : ["debug", "error", "warn", "log"],
  });

  app.use(helmet({
    contentSecurityPolicy: false, // adjusted by Caddy / frontend
  }));
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.INSTANCE_URL || true,
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // In-flight requests finish before the process exits, and Prisma closes its
  // pool, instead of the container being torn out from under whoever is
  // mid-request during a deploy.
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Horizon API listening on port ${port}`);

  /**
   * Shut down on a signal, but never hang doing it.
   *
   * `app.close()` alone is not enough: Node keeps idle keep-alive sockets open
   * and waits for them, so a container with any recent client sits there until
   * the orchestrator gives up and SIGKILLs it — which drops exactly the
   * in-flight requests graceful shutdown was meant to protect. Idle sockets are
   * closed explicitly, and a timeout is the backstop if something still holds
   * the loop.
   */
  const httpServer = app.getHttpServer() as {
    closeIdleConnections?: () => void;
  };
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down.`);

    const forced = setTimeout(() => {
      console.error("Shutdown took too long; exiting.");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    forced.unref();

    try {
      httpServer.closeIdleConnections?.();
      await app.close();
      console.log("Shutdown complete.");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}

/** How long in-flight work gets before the process exits regardless. */
const SHUTDOWN_GRACE_MS = 10_000;

bootstrap().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
